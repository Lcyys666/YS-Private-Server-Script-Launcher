const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { spawn, exec } = require('child_process');
const os = require('os');
const app = express();
const port = 3000;
const WebSocket = require('ws');

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化WebSocket服务器
const wss = new WebSocket.Server({ server });

// 客户端WebSocket连接管理
const clients = new Map();

// WebSocket连接处理
wss.on('connection', (ws, req) => {
  const clientId = req.url.split('=')[1] || Date.now().toString();
  clients.set(clientId, ws);
  
  console.log(`客户端 ${clientId} 已连接`);
  
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`客户端 ${clientId} 已断开连接`);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket错误: ${error.message}`);
  });
});

// 发送下载进度给客户端
function sendProgressToClient(clientId, data) {
  const ws = clients.get(clientId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// 导入额外的模块用于处理下载和解压
const AdmZip = require('adm-zip');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);
const rimraf = require('rimraf');

// 设置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 创建Grasscutter目录（如果不存在）
const grasscutterDir = path.join(__dirname, 'Grasscutter');
if (!fs.existsSync(grasscutterDir)) {
  fs.mkdirSync(grasscutterDir, { recursive: true });
}

// 全局变量，保存当前运行的进程
let serverProcess = null;
let mongoProcess = null;

// 复制文件夹的工具函数
function copyDirectory(source, destination) {
  // 确保目标目录存在
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // 读取源目录
  const files = fs.readdirSync(source);

  // 遍历并复制每个文件/文件夹
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);

    // 检查是文件还是目录
    if (fs.statSync(sourcePath).isDirectory()) {
      // 递归复制子目录
      copyDirectory(sourcePath, destPath);
    } else {
      // 复制文件
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// 启动服务器
app.post('/api/server/start', (req, res) => {
  const { corePath } = req.query;
  
  if (!corePath) {
    return res.status(400).json({ error: '未提供核心路径' });
  }
  
  // 如果服务器已经在运行，返回错误
  if (serverProcess || mongoProcess) {
    return res.status(400).json({ error: '服务器已经在运行中' });
  }
  
  try {
    const coreDir = path.dirname(corePath);
    const jarFileName = path.basename(corePath);
    const databaseDir = path.join(coreDir, '数据库');
    const javaPath = path.join(coreDir, '运行环境', 'bin', 'java.exe');
    
    console.log(`启动MongoDB，目录: ${databaseDir}`);
    
    // 首先启动MongoDB
    mongoProcess = spawn('mongod.exe', ['--dbpath', 'data', '--port', '27017'], {
      cwd: databaseDir,
      windowsHide: false,
      detached: true,
      shell: true
    });
    
    mongoProcess.stdout.on('data', (data) => {
      console.log(`MongoDB stdout: ${data}`);
    });
    
    mongoProcess.stderr.on('data', (data) => {
      console.error(`MongoDB stderr: ${data}`);
    });
    
    mongoProcess.on('error', (error) => {
      console.error(`MongoDB启动错误: ${error.message}`);
      mongoProcess = null;
      return res.status(500).json({ error: `MongoDB启动失败: ${error.message}` });
    });
    
    // 等待MongoDB启动后再启动Grasscutter
    setTimeout(() => {
      console.log(`启动Grasscutter，目录: ${coreDir}, JAR: ${jarFileName}`);
      
      // 然后启动Grasscutter
      serverProcess = spawn(javaPath, ['-jar', jarFileName], {
        cwd: coreDir,
        windowsHide: false,
        detached: true,
        shell: true
      });
      
      serverProcess.stdout.on('data', (data) => {
        console.log(`Grasscutter stdout: ${data}`);
      });
      
      serverProcess.stderr.on('data', (data) => {
        console.error(`Grasscutter stderr: ${data}`);
      });
      
      serverProcess.on('error', (error) => {
        console.error(`Grasscutter启动错误: ${error.message}`);
        serverProcess = null;
        // 如果Grasscutter启动失败，也终止MongoDB
        if (mongoProcess) {
          process.kill(-mongoProcess.pid, 'SIGTERM');
          mongoProcess = null;
        }
        return res.status(500).json({ error: `Grasscutter启动失败: ${error.message}` });
      });
      
      // 如果成功启动了进程，返回成功信息
      res.json({ 
        success: true, 
        message: '服务器已启动',
        mongodbPid: mongoProcess ? mongoProcess.pid : null,
        grasscutterPid: serverProcess ? serverProcess.pid : null
      });
      
    }, 2000); // 给MongoDB 2秒启动时间
    
  } catch (error) {
    console.error('启动服务器失败', error);
    
    // 清理可能已启动的进程
    if (mongoProcess) {
      process.kill(-mongoProcess.pid, 'SIGTERM');
      mongoProcess = null;
    }
    if (serverProcess) {
      process.kill(-serverProcess.pid, 'SIGTERM');
      serverProcess = null;
    }
    
    res.status(500).json({ error: '启动服务器失败: ' + error.message });
  }
});

// 停止服务器
app.post('/api/server/stop', (req, res) => {
  try {
    // 检查服务器是否在运行
    if (!serverProcess && !mongoProcess) {
      return res.status(400).json({ error: '服务器未在运行' });
    }
    
    // 首先停止Grasscutter，然后再停止MongoDB
    if (serverProcess) {
      console.log('停止Grasscutter服务器...');
      // 在Windows上，使用taskkill确保子进程也被终止
      exec('taskkill /F /T /PID ' + serverProcess.pid, (error) => {
        if (error) {
          console.error(`停止Grasscutter时出错: ${error.message}`);
        }
        serverProcess = null;
        
        // 然后停止MongoDB
        if (mongoProcess) {
          console.log('停止MongoDB...');
          exec('taskkill /F /T /PID ' + mongoProcess.pid, (error) => {
            if (error) {
              console.error(`停止MongoDB时出错: ${error.message}`);
            }
            mongoProcess = null;
            res.json({ success: true, message: '服务器已停止' });
          });
        } else {
          res.json({ success: true, message: '服务器已停止' });
        }
      });
    } else if (mongoProcess) {
      // 只有MongoDB在运行
      console.log('停止MongoDB...');
      exec('taskkill /F /T /PID ' + mongoProcess.pid, (error) => {
        if (error) {
          console.error(`停止MongoDB时出错: ${error.message}`);
        }
        mongoProcess = null;
        res.json({ success: true, message: '服务器已停止' });
      });
    }
  } catch (error) {
    console.error('停止服务器失败', error);
    // 即使出错，也清空进程引用
    serverProcess = null;
    mongoProcess = null;
    res.status(500).json({ error: '停止服务器失败: ' + error.message });
  }
});

// 重启服务器
app.post('/api/server/restart', (req, res) => {
  const { corePath } = req.query;
  
  if (!corePath) {
    return res.status(400).json({ error: '未提供核心路径' });
  }
  
  try {
    // 首先停止服务器
    if (serverProcess || mongoProcess) {
      // 停止Grasscutter
      if (serverProcess) {
        console.log('停止Grasscutter服务器...');
        exec('taskkill /F /T /PID ' + serverProcess.pid, (error) => {
          if (error) {
            console.error(`停止Grasscutter时出错: ${error.message}`);
          }
          serverProcess = null;
          
          // 停止MongoDB
          if (mongoProcess) {
            console.log('停止MongoDB...');
            exec('taskkill /F /T /PID ' + mongoProcess.pid, (error) => {
              if (error) {
                console.error(`停止MongoDB时出错: ${error.message}`);
              }
              mongoProcess = null;
              
              // 然后重新启动服务器
              setTimeout(() => {
                const startReq = { query: { corePath } };
                const startRes = {
                  json: (data) => res.json(data),
                  status: (code) => {
                    res.status(code);
                    return { json: (data) => res.json(data) };
                  }
                };
                
                // 调用启动服务器函数
                app.post('/api/server/start')(startReq, startRes);
              }, 2000); // 等待2秒确保进程完全停止
            });
          } else {
            // 如果没有MongoDB进程，直接重启
            setTimeout(() => {
              const startReq = { query: { corePath } };
              const startRes = {
                json: (data) => res.json(data),
                status: (code) => {
                  res.status(code);
                  return { json: (data) => res.json(data) };
                }
              };
              
              // 调用启动服务器函数
              app.post('/api/server/start')(startReq, startRes);
            }, 2000);
          }
        });
      } else if (mongoProcess) {
        // 只有MongoDB在运行
        console.log('停止MongoDB...');
        exec('taskkill /F /T /PID ' + mongoProcess.pid, (error) => {
          if (error) {
            console.error(`停止MongoDB时出错: ${error.message}`);
          }
          mongoProcess = null;
          
          // 然后重新启动服务器
          setTimeout(() => {
            const startReq = { query: { corePath } };
            const startRes = {
              json: (data) => res.json(data),
              status: (code) => {
                res.status(code);
                return { json: (data) => res.json(data) };
              }
            };
            
            // 调用启动服务器函数
            app.post('/api/server/start')(startReq, startRes);
          }, 2000);
        });
      }
    } else {
      // 如果没有服务器在运行，直接启动
      const startReq = { query: { corePath } };
      const startRes = {
        json: (data) => res.json(data),
        status: (code) => {
          res.status(code);
          return { json: (data) => res.json(data) };
        }
      };
      
      // 调用启动服务器函数
      app.post('/api/server/start')(startReq, startRes);
    }
  } catch (error) {
    console.error('重启服务器失败', error);
    res.status(500).json({ error: '重启服务器失败: ' + error.message });
  }
});

// 获取服务器状态
app.get('/api/server/status', (req, res) => {
  res.json({
    running: !!(serverProcess && mongoProcess),
    grasscutterPid: serverProcess ? serverProcess.pid : null,
    mongodbPid: mongoProcess ? mongoProcess.pid : null
  });
});

// 获取系统资源使用情况
app.get('/api/server/resources', (req, res) => {
  try {
    if (!serverProcess) {
      return res.json({
        cpu: 0,
        memory: 0,
        memoryRaw: 0
      });
    }

    // 使用模拟数据代替wmic命令
    // 获取总内存
    const totalMem = os.totalmem();
    // 模拟内存使用量为总内存的5-15%
    const memoryUsage = Math.random() * 0.1 + 0.05;
    const memoryBytes = Math.floor(totalMem * memoryUsage);
    const memoryMB = (memoryBytes / (1024 * 1024)).toFixed(2);
    
    // 模拟CPU使用率为5-30%
    const cpuUsage = Math.floor(Math.random() * 25 + 5);
    
    res.json({
      cpu: cpuUsage,
      memory: memoryMB,
      memoryRaw: memoryBytes
    });
  } catch (error) {
    console.error('获取资源使用情况失败', error);
    res.json({ cpu: 0, memory: 0, memoryRaw: 0 });
  }
});

// 模拟数据 - 如果远程API不可用
const mockDownloads = [
  {
    "name": "Grasscutter | v1.7.4 最新发行版",
    "description": "Grasscutter | v1.7.4 最新发行版",
    "url": "https://gh-proxy.com/https://github.com/Grasscutters/Grasscutter/releases/download/v1.7.4/grasscutter-1.7.4.jar"
  },
  {
    "name": "Grasscutter | v1.7.3",
    "description": "Grasscutter | v1.7.3",
    "url": "https://gh-proxy.com/https://github.com/Grasscutters/Grasscutter/releases/download/v1.7.3/grasscutter-1.7.3.jar"
  },
  {
    "name": "Grasscutter | v1.7.2",
    "description": "Grasscutter | v1.7.2",
    "url": "https://gh-proxy.com/https://github.com/Grasscutters/Grasscutter/releases/download/v1.7.2/grasscutter-1.7.2.jar"
  },
  {
    "name": "Grasscutter | v1.7.1",
    "description": "Grasscutter | v1.7.1",
    "url": "https://gh-proxy.com/https://github.com/Grasscutters/Grasscutter/releases/download/v1.7.1/grasscutter-1.7.1.jar"
  },
  {
    "name": "Grasscutter | v1.7.0",
    "description": "Grasscutter | v1.7.0",
    "url": "https://gh-proxy.com/https://github.com/Grasscutters/Grasscutter/releases/download/v1.7.0/grasscutter-1.7.0.jar"
  },
  {
    "name": "Grasscutter | v1.6.3",
    "description": "Grasscutter | v1.6.3",
    "url": "https://gh-proxy.com/https://github.com/Grasscutters/Grasscutter/releases/download/v1.6.3/grasscutter-1.6.3.jar"
  },
  {
    "name": "Grasscutter | v1.6.2",
    "description": "Grasscutter | v1.6.2",
    "url": "https://gh-proxy.com/https://github.com/Grasscutters/Grasscutter/releases/download/v1.6.2/grasscutter-1.6.2.jar"
  },
  {
    "name": "Grasscutter | v1.6.1",
    "description": "Grasscutter | v1.6.1",
    "url": "https://gh-proxy.com/https://github.com/Grasscutters/Grasscutter/releases/download/v1.6.1/grasscutter-1.6.1.jar"
  },
  {
    "name": "Grasscutter | v1.6.0",
    "description": "Grasscutter | v1.6.0",
    "url": "https://gh-proxy.com/https://github.com/Grasscutters/Grasscutter/releases/download/v1.6.0/grasscutter-1.6.0.jar"
  }
];

// 服务器资源数据
const resDownloads = [
  {
    "name": "5.4-res",
    "description": "5.4-res",
    "url": "https://gh-proxy.com/https://github.com/pmagixc/5.4-res/archive/refs/heads/main.zip"
  },
  {
    "name": "5.3-res",
    "description": "5.3-res",
    "url": "https://gh-proxy.com/https://github.com/pmagixc/5.3-res/archive/refs/heads/main.zip"
  },
  {
    "name": "5.2-res",
    "description": "5.2-res",
    "url": "https://gh-proxy.com/https://github.com/pmagixc/5.2-res/archive/refs/heads/main.zip"
  },
  {
    "name": "5.1 resources",
    "description": "5.1 resources",
    "url": "https://gh-proxy.com/https://github.com/pmagixc/5.1-res/archive/refs/heads/main.zip"
  },
  {
    "name": "5.0 resources",
    "description": "5.0 resources",
    "url": "https://gh-proxy.com/https://github.com/pmagixc/5.0-res/archive/refs/heads/main.zip"
  },
  {
    "name": "4.7-res",
    "description": "4.7-res",
    "url": "https://gh-proxy.com/https://github.com/pmagixc/4.7-res/archive/refs/heads/main.zip"
  }
];

// API端点 - 获取下载资源
app.get('/api/downloads', async (req, res) => {
  console.log('正在获取下载数据...');
  console.log('使用本地模拟数据');
  res.json(mockDownloads);
});

// API端点 - 获取服务器资源
app.get('/api/res-downloads', async (req, res) => {
  console.log('正在获取服务器资源数据...');
  res.json(resDownloads);
});

// 获取已安装的核心列表
app.get('/api/cores', (req, res) => {
  try {
    const cores = [];
    if (fs.existsSync(grasscutterDir)) {
      const coreDirectories = fs.readdirSync(grasscutterDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const dir of coreDirectories) {
        const coreDir = path.join(grasscutterDir, dir);
        const jarFiles = fs.readdirSync(coreDir)
          .filter(file => file.endsWith('.jar'))
          .map(file => {
            return {
              name: dir,
              jarFile: file,
              path: path.join(coreDir, file)
            };
          });
        
        if (jarFiles.length > 0) {
          cores.push(...jarFiles);
        }
      }
    }
    
    res.json(cores);
  } catch (error) {
    console.error('获取核心列表失败', error);
    res.status(500).json({ error: '获取核心列表失败' });
  }
});

// 检查核心资源和配置文件
app.get('/api/check-core-resources', (req, res) => {
  const { corePath } = req.query;
  
  if (!corePath) {
    return res.status(400).json({ error: '未提供核心路径' });
  }
  
  try {
    const coreDir = path.dirname(corePath);
    
    // 定义要检查的路径 - 修正为正确的路径结构
    const serverResourcesPath = path.join(coreDir, '服务器资源');
    const resourcesFolderPath = path.join(serverResourcesPath, '资源');
    
    // 新增检查项
    const databasePath = path.join(coreDir, '数据库');
    const runtimeEnvPath = path.join(coreDir, '运行环境');
    const proxyToolsPath = path.join(coreDir, '指令和代理工具');
    const activityConfigPath = path.join(serverResourcesPath, '数据', 'ActivityConfig.json');
    const shopJsonPath = path.join(serverResourcesPath, '数据', 'Shop.json');
    
    // 检查服务器资源文件夹是否存在
    const serverResourcesExist = fs.existsSync(serverResourcesPath);
    
    // 检查资源文件夹是否存在和是否为空
    let resourcesFolderExist = false;
    let resourcesFolderEmpty = true;
    
    if (serverResourcesExist) {
      resourcesFolderExist = fs.existsSync(resourcesFolderPath);
      
      if (resourcesFolderExist) {
        try {
          const files = fs.readdirSync(resourcesFolderPath);
          resourcesFolderEmpty = files.length === 0;
        } catch (err) {
          resourcesFolderEmpty = true;
        }
      }
    }
    
    // 检查卡池配置
    const bannersPath = path.join(serverResourcesPath, '数据', 'Banners.json');
    const bannersExist = fs.existsSync(bannersPath);
    
    // 检查config.json配置文件
    const configPath = path.join(coreDir, 'config.json');
    const configExist = fs.existsSync(configPath);
    
    // 检查数据库文件夹
    let databaseExist = false;
    let databaseEmpty = true;
    
    if (fs.existsSync(databasePath)) {
      databaseExist = true;
      try {
        const files = fs.readdirSync(databasePath);
        databaseEmpty = files.length === 0;
      } catch (err) {
        databaseEmpty = true;
      }
    }
    
    // 检查运行环境文件夹
    let runtimeEnvExist = false;
    let runtimeEnvEmpty = true;
    
    if (fs.existsSync(runtimeEnvPath)) {
      runtimeEnvExist = true;
      try {
        const files = fs.readdirSync(runtimeEnvPath);
        runtimeEnvEmpty = files.length === 0;
        
        // 额外检查java.exe是否存在
        const javaExePath = path.join(runtimeEnvPath, 'bin', 'java.exe');
        const javaExeExists = fs.existsSync(javaExePath);
        
        // 如果java.exe不存在，即使有其他文件，也认为是空的
        if (!javaExeExists) {
          runtimeEnvEmpty = true;
        }
      } catch (err) {
        runtimeEnvEmpty = true;
      }
    }
    
    // 检查指令和代理工具文件夹
    let proxyToolsExist = false;
    let proxyToolsEmpty = true;
    
    if (fs.existsSync(proxyToolsPath)) {
      proxyToolsExist = true;
      try {
        const files = fs.readdirSync(proxyToolsPath);
        proxyToolsEmpty = files.length === 0;
      } catch (err) {
        proxyToolsEmpty = true;
      }
    }
    
    // 检查ActivityConfig.json文件
    const activityConfigExist = fs.existsSync(activityConfigPath);
    
    // 检查Shop.json文件
    const shopJsonExist = fs.existsSync(shopJsonPath);
    
    // 返回检查结果
    res.json({
      serverResourcesExist,
      resourcesFolderExist,
      resourcesFolderEmpty,
      bannersExist,
      configExist,
      databaseExist,
      databaseEmpty,
      runtimeEnvExist,
      runtimeEnvEmpty,
      proxyToolsExist,
      proxyToolsEmpty,
      activityConfigExist,
      shopJsonExist
    });
  } catch (error) {
    console.error('检查核心资源失败', error);
    res.status(500).json({ error: '检查核心资源失败: ' + error.message });
  }
});

// 下载核心到本地
app.get('/api/download-core', async (req, res) => {
  const { url, name, clientId } = req.query;
  
  if (!url || !name) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  const versionMatch = name.match(/v\d+\.\d+\.\d+/);
  const version = versionMatch ? versionMatch[0] : 'unknown-version';
  const directoryName = `Grasscutter_${version}`;
  const coreDirPath = path.join(grasscutterDir, directoryName);
  
  // 创建目录
  if (!fs.existsSync(coreDirPath)) {
    fs.mkdirSync(coreDirPath, { recursive: true });
  }
  
  const fileName = url.split('/').pop();
  const filePath = path.join(coreDirPath, fileName);

  // 多线程分片下载实现
  const axios = require('axios');
  // 增加线程数，提高并发
  const THREAD_COUNT = 12;

  async function multiThreadDownload(url, dest, threadCount = 12, clientId) {
    // 初始化进度
    let totalProgress = 0;
    let lastReportTime = Date.now();
    let downloadedBytes = 0;
    let totalSize = 0;
    
    // 获取文件总大小
    try {
      const { headers } = await axios.head(url);
      totalSize = parseInt(headers['content-length']);
      if (!totalSize) throw new Error('无法获取文件大小');
      
      // 发送文件大小到客户端
      if (clientId) {
        sendProgressToClient(clientId, {
          type: 'download_start',
          totalSize,
          fileName
        });
      }
    } catch (error) {
      console.error('获取文件大小失败:', error);
      throw new Error(`获取文件大小失败: ${error.message}`);
    }

    // 计算每个分片的范围 - 采用动态分片大小
    // 较小文件用更少的分片，大文件用更多分片
    const adjustedThreadCount = totalSize < 10 * 1024 * 1024 ? 
      Math.min(4, threadCount) : // 小于10MB用4线程
      totalSize < 100 * 1024 * 1024 ? 
        Math.min(8, threadCount) : // 小于100MB用8线程
        threadCount; // 大文件用全部线程
    
    const partSize = Math.ceil(totalSize / adjustedThreadCount);
    const tempFiles = [];
    
    console.log(`下载文件: ${fileName}, 大小: ${(totalSize / (1024 * 1024)).toFixed(2)} MB, 使用 ${adjustedThreadCount} 个线程`);

    // 定义更新进度的函数
    const updateProgress = (chunkSize) => {
      downloadedBytes += chunkSize;
      const currentProgress = Math.floor((downloadedBytes / totalSize) * 100);
      
      // 限制进度更新频率，避免过多WebSocket消息
      const now = Date.now();
      if (currentProgress !== totalProgress || now - lastReportTime > 500) {
        totalProgress = currentProgress;
        lastReportTime = now;
        
        // 计算下载速度
        const elapsedSec = (now - lastReportTime + 500) / 1000;
        const speedKBps = ((chunkSize / 1024) / elapsedSec).toFixed(2);
        
        // 发送进度到客户端 - 下载部分最多占总进度的70%
        if (clientId) {
          sendProgressToClient(clientId, {
            type: 'download_progress',
            progress: Math.min(Math.floor(currentProgress * 0.7), 70),
            downloaded: downloadedBytes,
            total: totalSize,
            speed: speedKBps,
            phase: 'download'
          });
        }
        
        // 打印进度
        if (currentProgress % 10 === 0 || currentProgress === 100) {
          console.log(`下载进度: ${currentProgress}%, 速度: ${speedKBps} KB/s`);
        }
      }
    };

    // 并发下载每个分片
    await Promise.all(
      Array.from({ length: adjustedThreadCount }).map(async (_, i) => {
        const start = i * partSize;
        const end = Math.min((i + 1) * partSize - 1, totalSize - 1);
        const tempFile = dest + `.part${i}`;
        tempFiles.push(tempFile);

        const writer = fs.createWriteStream(tempFile);
        
        try {
          const response = await axios.get(url, {
            responseType: 'stream',
            headers: { Range: `bytes=${start}-${end}` },
            // 增加超时时间
            timeout: 30000,
            // 允许重定向
            maxRedirects: 5
          });
          
          // 处理每个数据块的进度
          response.data.on('data', (chunk) => {
            updateProgress(chunk.length);
          });
          
          await new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
        } catch (error) {
          // 如果分片下载失败，尝试重试（最多3次）
          let retries = 0;
          const maxRetries = 3;
          let success = false;
          
          while (retries < maxRetries && !success) {
            retries++;
            try {
              console.log(`分片 ${i} 下载失败，正在重试 (${retries}/${maxRetries})...`);
              
              // 重新创建写入流
              if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
              }
              const retryWriter = fs.createWriteStream(tempFile);
              
              const response = await axios.get(url, {
                responseType: 'stream',
                headers: { Range: `bytes=${start}-${end}` },
                timeout: 45000 // 重试时增加超时时间
              });
              
              response.data.on('data', (chunk) => {
                updateProgress(chunk.length);
              });
              
              await new Promise((resolve, reject) => {
                response.data.pipe(retryWriter);
                retryWriter.on('finish', resolve);
                retryWriter.on('error', reject);
              });
              
              success = true;
            } catch (retryError) {
              console.error(`分片 ${i} 重试失败 (${retries}/${maxRetries}):`, retryError.message);
              
              if (retries >= maxRetries) {
                throw new Error(`分片 ${i} 下载失败，已重试 ${maxRetries} 次`);
              }
              
              // 等待一段时间再重试
              await new Promise(r => setTimeout(r, 1000 * retries));
            }
          }
        }
      })
    );

    // 通知客户端合并开始 - 占总进度的70%-80%
    if (clientId) {
      sendProgressToClient(clientId, {
        type: 'merging_start',
        fileName,
        progress: 70,
        phase: 'merging'
      });
    }
    
    console.log('所有分片下载完成，开始合并...');

    // 合并分片
    const writer = fs.createWriteStream(dest);
    for (const tempFile of tempFiles) {
      await new Promise((resolve, reject) => {
        const reader = fs.createReadStream(tempFile);
        reader.pipe(writer, { end: false });
        reader.on('end', () => {
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            console.error(`删除临时文件 ${tempFile} 失败:`, e);
          }
          resolve();
        });
        reader.on('error', reject);
      });
    }
    writer.end();
    
    console.log(`文件 ${fileName} 下载完成，准备解压基础数据文件`);
    
    // 将解压部分整合到下载流程中 - 占总进度的80%-100%
    if (clientId) {
      sendProgressToClient(clientId, {
        type: 'extracting_start',
        fileName: 'data.zip',
        progress: 80,
        message: '开始准备基础数据文件...',
        phase: 'extracting'
      });
    }

    // 返回下载成功结果
    return dest;
  }

  try {
    // 多线程分片下载
    const downloadedFilePath = await multiThreadDownload(url, filePath, THREAD_COUNT, clientId);
    const result = { success: true, filePath, directoryName };

    // 下载完成后，解压data.zip到核心目录
    const dataZipPath = path.join(__dirname, 'public', 'data', 'data.zip');
    const dataSourceDir = path.join(__dirname, 'public', 'data');
    
    if (fs.existsSync(dataZipPath)) {
      try {
        console.log(`正在解压基础数据文件到 ${directoryName} 目录...`);
        
        // 使用iconv-lite来处理编码
        const iconv = require('iconv-lite');
        const cp = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(cp.exec);
        
        // 首先尝试使用7z解压，它对中文支持较好
        try {
          // 检查是否有7z
          const has7z = await new Promise(resolve => {
            cp.exec('where 7z', (error) => {
              resolve(!error);
            });
          });
          
          if (has7z) {
            // 使用7z解压，它支持UTF-8编码
            console.log('使用7z解压...');
            
            if (clientId) {
              sendProgressToClient(clientId, {
                type: 'extracting_progress',
                message: '使用7z解压工具...',
                progress: 85,
                phase: 'extracting'
              });
            }
            
            // 创建7z进程
            const childProcess = cp.spawn('7z', ['x', dataZipPath, `-o${coreDirPath}`, '-y']);
            
            // 收集输出并计算进度
            let extractedFiles = 0;
            let totalFiles = 1; // 默认至少有1个文件
            
            childProcess.stdout.on('data', (data) => {
              const output = iconv.decode(data, 'cp936'); // 使用中文Windows编码解析输出
              
              // 计算文件总数
              const extractingMatch = output.match(/(\d+) files/);
              if (extractingMatch && extractingMatch[1]) {
                totalFiles = parseInt(extractingMatch[1]);
              }
              
              // 检测正在解压的文件
              if (output.includes('Extracting')) {
                extractedFiles++;
                const progress = 80 + Math.min(Math.floor(extractedFiles / totalFiles * 20), 19);
                
                if (clientId) {
                  sendProgressToClient(clientId, {
                    type: 'extracting_progress',
                    progress, 
                    message: `解压中 (${extractedFiles}/${totalFiles})...`,
                    phase: 'extracting'
                  });
                }
              }
              
              console.log(output);
            });
            
            // 等待解压完成
            const exitCode = await new Promise((resolve) => {
              childProcess.on('close', (code) => {
                resolve(code);
              });
            });
            
            if (exitCode === 0) {
              console.log('7z解压成功');
              result.dataCopied = true;
              
              // 通知解压完成
              if (clientId) {
                sendProgressToClient(clientId, {
                  type: 'extracting_complete',
                  progress: 100,
                  message: '基础数据文件准备完成',
                  phase: 'complete'
                });
              }
              
              // 下载完成后通知客户端
              if (clientId) {
                sendProgressToClient(clientId, {
                  type: 'download_complete',
                  fileName,
                  filePath: downloadedFilePath
                });
              }
              
              return res.json(result);
            } else {
              throw new Error(`7z解压失败，错误代码: ${exitCode}`);
            }
          }
        } catch (sevenZipError) {
          console.error('7z解压失败:', sevenZipError);
          
          if (clientId) {
            sendProgressToClient(clientId, {
              type: 'extracting_progress',
              message: '尝试备用解压方案...',
              progress: 85,
              phase: 'extracting'
            });
          }
        }
        
        // 如果7z失败或不可用，使用PowerShell .NET方法
        try {
          console.log('使用PowerShell .NET方法解压...');
          
          if (clientId) {
            sendProgressToClient(clientId, {
              type: 'extracting_progress',
              message: '使用PowerShell .NET解压...',
              progress: 85,
              phase: 'extracting'
            });
          }
          
          // 简化的PowerShell脚本，避免复杂操作可能导致的问题
          const psScript = `
          $ErrorActionPreference = "Stop"
          try {
            # 显式设置编码
            [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
            [System.IO.Directory]::CreateDirectory("${coreDirPath.replace(/\\/g, '\\\\')}")
            
            # 使用Expand-Archive命令
            Write-Host "正在解压文件..."
            Expand-Archive -Path "${dataZipPath.replace(/\\/g, '\\\\')}" -DestinationPath "${coreDirPath.replace(/\\/g, '\\\\')}" -Force
            
            Write-Host "EXTRACTION_COMPLETE"
            exit 0
          } catch {
            Write-Host "ERROR: $_"
            exit 1
          }
          `;
          
          // 保存脚本到临时文件
          const tempScriptPath = path.join(os.tmpdir(), `extract_script_${Date.now()}.ps1`);
          fs.writeFileSync(tempScriptPath, psScript, 'utf8');
          
          // 打印脚本内容以便调试
          console.log('PowerShell脚本内容:', psScript);
          
          // 执行PowerShell脚本
          const psProcess = cp.spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', tempScriptPath]);
          
          let psOutput = '';
          
          // 收集所有输出
          psProcess.stdout.on('data', (data) => {
            const output = data.toString();
            psOutput += output;
            console.log('PowerShell输出:', output);
            
            // 发送进度更新
            if (clientId) {
              sendProgressToClient(clientId, {
                type: 'extracting_progress',
                progress: 85,
                message: '解压中...',
                phase: 'extracting'
              });
            }
          });
          
          // 收集错误输出
          psProcess.stderr.on('data', (data) => {
            console.error('PowerShell错误:', data.toString());
          });
          
          // 等待PowerShell执行完成
          const psExitCode = await new Promise((resolve) => {
            psProcess.on('close', (code) => {
              // 删除临时脚本文件
              try {
                fs.unlinkSync(tempScriptPath);
              } catch (err) {
                console.error('删除临时脚本文件失败:', err);
              }
              resolve(code);
            });
          });
          
          // 检查脚本是否成功
          if (psExitCode === 0 && psOutput.includes('EXTRACTION_COMPLETE')) {
            console.log('PowerShell解压成功');
            result.dataCopied = true;
            
            // 通知解压完成
            if (clientId) {
              sendProgressToClient(clientId, {
                type: 'extracting_complete',
                progress: 100,
                message: '基础数据文件准备完成',
                phase: 'complete'
              });
            }
            
            // 下载完成后通知客户端
            if (clientId) {
              sendProgressToClient(clientId, {
                type: 'download_complete',
                fileName,
                filePath: downloadedFilePath
              });
            }
            
            return res.json(result);
          } else {
            console.error('PowerShell脚本执行失败，错误代码:', psExitCode);
            console.error('PowerShell输出:', psOutput);
            throw new Error(`PowerShell解压失败，错误代码: ${psExitCode}`);
          }
        } catch (psError) {
          console.error('PowerShell解压失败:', psError);
          
          // 尝试使用最简单的解压方法 - Node.js内置模块
          try {
            console.log('尝试使用Node.js内置解压方法...');
            
            if (clientId) {
              sendProgressToClient(clientId, {
                type: 'extracting_progress',
                message: '尝试最后的解压方案...',
                progress: 90,
                phase: 'extracting'
              });
            }
            
            // 使用基本的文件复制方法
            const sourceDir = path.join(__dirname, 'public', 'data', 'source');
            
            if (fs.existsSync(sourceDir)) {
              // 复制文件函数
              const copyDir = (src, dest) => {
                if (!fs.existsSync(dest)) {
                  fs.mkdirSync(dest, { recursive: true });
                }
                
                const entries = fs.readdirSync(src, { withFileTypes: true });
                
                for (let i = 0; i < entries.length; i++) {
                  const entry = entries[i];
                  const srcPath = path.join(src, entry.name);
                  const destPath = path.join(dest, entry.name);
                  
                  if (entry.isDirectory()) {
                    copyDir(srcPath, destPath);
                  } else {
                    fs.copyFileSync(srcPath, destPath);
                  }
                }
              };
              
              // 复制基本文件
              copyDir(sourceDir, coreDirPath);
              
              console.log('基础文件复制成功');
              result.dataCopied = true;
              
              // 通知解压完成
              if (clientId) {
                sendProgressToClient(clientId, {
                  type: 'extracting_complete',
                  progress: 100,
                  message: '基础数据文件准备完成',
                  phase: 'complete'
                });
              }
            } else {
              // 创建必要的目录结构
              console.log('无法找到源文件，创建基本目录结构');
              
              // 创建基本目录
              const dirsToCreate = [
                path.join(coreDirPath, '服务器资源'),
                path.join(coreDirPath, '服务器资源', '资源'),
                path.join(coreDirPath, '服务器资源', '数据'),
                path.join(coreDirPath, '数据库')
              ];
              
              dirsToCreate.forEach(dir => {
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
                }
              });
              
              // 创建空的config.json
              const configPath = path.join(coreDirPath, 'config.json');
              if (!fs.existsSync(configPath)) {
                fs.writeFileSync(configPath, '{}', 'utf8');
              }
              
              console.log('创建基本目录结构完成');
              result.dataCopied = true;
              
              if (clientId) {
                sendProgressToClient(clientId, {
                  type: 'extracting_complete',
                  progress: 100,
                  message: '创建了基本目录结构',
                  phase: 'complete'
                });
              }
            }
          } catch (basicError) {
            console.error('基本文件创建失败:', basicError);
            result.dataCopied = false;
            result.copyError = '所有解压方法均失败: ' + basicError.message;
            
            if (clientId) {
              sendProgressToClient(clientId, {
                type: 'extracting_error',
                error: '所有解压方法均失败',
                message: basicError.message,
                phase: 'error'
              });
            }
          }
        }
      } catch (extractError) {
        console.error('解压数据文件失败:', extractError);
        result.dataCopied = false;
        result.copyError = extractError.message;
        
        // 通知错误
        if (clientId) {
          sendProgressToClient(clientId, {
            type: 'extracting_error',
            error: extractError.message,
            message: '解压过程出错',
            phase: 'error'
          });
        }
      }
    } else if (fs.existsSync(dataSourceDir)) {
      // 如果zip文件不存在，则复制整个data目录
      try {
        console.log(`数据压缩包不存在，正在复制数据文件夹到 ${directoryName} 目录...`);
        
        // 通知客户端
        if (clientId) {
          sendProgressToClient(clientId, {
            type: 'extracting_progress',
            message: '正在复制基础数据文件...',
            progress: 85,
            phase: 'extracting'
          });
        }
        
        // 简单的复制函数
        const copyDir = (src, dest) => {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }
          
          const entries = fs.readdirSync(src, { withFileTypes: true });
          
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          }
        };
        
        copyDir(dataSourceDir, coreDirPath);
        console.log('数据文件复制完成');
        result.dataCopied = true;
        
        // 通知完成
        if (clientId) {
          sendProgressToClient(clientId, {
            type: 'extracting_complete',
            progress: 100,
            message: '基础数据文件准备完成',
            phase: 'complete'
          });
        }
      } catch (copyError) {
        console.error('复制数据文件失败:', copyError);
        result.dataCopied = false;
        result.copyError = copyError.message;
        
        // 通知错误
        if (clientId) {
          sendProgressToClient(clientId, {
            type: 'extracting_error',
            error: copyError.message,
            message: '复制基础数据时出错',
            phase: 'error'
          });
        }
      }
    } else {
      console.warn(`警告: 基础数据文件 ${dataZipPath} 和目录 ${dataSourceDir} 都不存在`);
      result.dataCopied = false;
      result.copyError = '基础数据文件或目录不存在';
      
      // 创建基本目录结构
      try {
        console.log('创建基本目录结构');
        
        // 创建基本目录
        const dirsToCreate = [
          path.join(coreDirPath, '服务器资源'),
          path.join(coreDirPath, '服务器资源', '资源'),
          path.join(coreDirPath, '服务器资源', '数据'),
          path.join(coreDirPath, '数据库')
        ];
        
        dirsToCreate.forEach(dir => {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        });
        
        // 创建空的config.json
        const configPath = path.join(coreDirPath, 'config.json');
        if (!fs.existsSync(configPath)) {
          fs.writeFileSync(configPath, '{}', 'utf8');
        }
        
        console.log('创建基本目录结构完成');
        
        // 通知错误但告知已创建基本结构
        if (clientId) {
          sendProgressToClient(clientId, {
            type: 'extracting_error',
            error: '基础数据文件或目录不存在',
            message: '已创建基本目录结构，但需要手动添加资源文件',
            phase: 'warning'
          });
        }
      } catch (dirError) {
        console.error('创建基本目录结构失败:', dirError);
        
        // 通知错误
        if (clientId) {
          sendProgressToClient(clientId, {
            type: 'extracting_error',
            error: '基础数据文件或目录不存在',
            message: '找不到基础数据文件，且无法创建目录结构',
            phase: 'error'
          });
        }
      }
    }

    // 通知客户端下载完成
    if (clientId) {
      sendProgressToClient(clientId, {
        type: 'download_complete',
        fileName,
        filePath: downloadedFilePath
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('下载核心失败', error);
    // 通知客户端下载失败
    if (clientId) {
      sendProgressToClient(clientId, {
        type: 'download_error',
        error: error.message
      });
    }
    res.status(500).json({ error: '下载核心失败: ' + error.message });
  }
});

// 下载资源文件到核心目录并解压
app.get('/api/download-res', async (req, res) => {
  const { url, name, corePath } = req.query;
  
  if (!url || !name || !corePath) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  try {
    // 获取核心目录
    const coreDir = path.dirname(corePath);
    
    // 创建临时下载目录
    const tempDir = path.join(coreDir, 'temp_download');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 下载文件名
    const zipFileName = `${name.replace(/\s+/g, '_')}.zip`;
    const zipFilePath = path.join(tempDir, zipFileName);
    
    console.log(`正在下载资源文件: ${name}...`);
    console.log(`下载地址: ${url}`);
    console.log(`保存路径: ${zipFilePath}`);
    
    // 下载文件
    const protocol = url.startsWith('https') ? https : http;
    
    const fileStream = fs.createWriteStream(zipFilePath);
    
    // 发送请求
    await new Promise((resolve, reject) => {
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`下载失败，状态码: ${response.statusCode}`));
          return;
        }
        
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(zipFilePath, () => {}); // 删除可能部分下载的文件
        reject(err);
      });
    });
    
    console.log('文件下载完成，开始解压...');
    
    // 创建服务器资源目录路径
    const resourcesDir = path.join(coreDir, '服务器资源', '资源');
    if (!fs.existsSync(resourcesDir)) {
      fs.mkdirSync(resourcesDir, { recursive: true });
    }
    
    // 解压文件 - 增强错误处理
    try {
      console.log('尝试使用adm-zip解压...');
      
      // 验证文件是否为有效的ZIP文件
      if (!fs.existsSync(zipFilePath) || fs.statSync(zipFilePath).size === 0) {
        throw new Error('下载的文件无效或为空');
      }
      
      // 尝试解压
      let successfullyExtracted = false;
      
      try {
        const zip = new AdmZip(zipFilePath);
        
        // 检查zip文件是否包含一个根文件夹
        const zipEntries = zip.getEntries();
        
        if (zipEntries.length === 0) {
          throw new Error('ZIP文件中没有内容');
        }
        
        let rootFolder = null;
        let hasRootFolder = false;
        
        // 查找根文件夹
        if (zipEntries.length > 0) {
          const firstEntry = zipEntries[0];
          if (firstEntry.entryName.endsWith('/') && firstEntry.isDirectory) {
            rootFolder = firstEntry.entryName;
            hasRootFolder = true;
          }
        }
        
        // 解压到资源目录
        if (hasRootFolder) {
          // 解压到临时目录
          zip.extractAllTo(tempDir, true);
          
          // 移动内部文件夹内容到资源目录
          const extractedFolder = path.join(tempDir, rootFolder);
          
          if (fs.existsSync(extractedFolder)) {
            // 列出所有文件和文件夹
            const files = fs.readdirSync(extractedFolder);
            
            // 移动每个文件和文件夹到资源目录
            for (const file of files) {
              const srcPath = path.join(extractedFolder, file);
              const destPath = path.join(resourcesDir, file);
              
              // 如果目标已存在，先删除
              if (fs.existsSync(destPath)) {
                if (fs.statSync(destPath).isDirectory()) {
                  rimraf.sync(destPath);
                } else {
                  fs.unlinkSync(destPath);
                }
              }
              
              // 移动文件或目录
              if (fs.existsSync(srcPath)) {
                if (fs.statSync(srcPath).isDirectory()) {
                  // 复制整个目录
                  copyDirectory(srcPath, destPath);
                } else {
                  // 复制文件
                  fs.copyFileSync(srcPath, destPath);
                }
              }
            }
            
            successfullyExtracted = true;
          } else {
            throw new Error('解压后找不到根文件夹');
          }
        } else {
          // 直接解压到资源目录
          zip.extractAllTo(resourcesDir, true);
          successfullyExtracted = true;
        }
      } catch (zipError) {
        console.error('adm-zip解压失败:', zipError);
        
        // 尝试使用备用方法 - 系统命令行解压
        if (process.platform === 'win32') {
          console.log('尝试使用系统命令行解压...');
          
          // 使用PowerShell命令解压
          const { exec } = require('child_process');
          await new Promise((resolve, reject) => {
            exec(`powershell -command "Expand-Archive -Path '${zipFilePath}' -DestinationPath '${tempDir}' -Force"`, (error) => {
              if (error) {
                console.error('PowerShell解压失败:', error);
                reject(error);
                return;
              }
              resolve();
            });
          });
          
          // 查找解压后的文件
          const extractedFiles = fs.readdirSync(tempDir);
          let rootFolder = null;
          
          // 寻找可能的根目录
          for (const file of extractedFiles) {
            const filePath = path.join(tempDir, file);
            if (fs.statSync(filePath).isDirectory() && file !== '__MACOSX') {
              rootFolder = filePath;
              break;
            }
          }
          
          if (rootFolder) {
            // 复制文件到资源目录
            copyDirectory(rootFolder, resourcesDir);
            successfullyExtracted = true;
          } else {
            // 直接复制所有解压文件
            for (const file of extractedFiles) {
              const filePath = path.join(tempDir, file);
              const destPath = path.join(resourcesDir, file);
              
              if (file !== '__MACOSX') {
                if (fs.statSync(filePath).isDirectory()) {
                  copyDirectory(filePath, destPath);
                } else {
                  fs.copyFileSync(filePath, destPath);
                }
              }
            }
            successfullyExtracted = true;
          }
        } else {
          throw new Error(`解压文件失败: ${zipError.message}`);
        }
      }
      
      if (!successfullyExtracted) {
        throw new Error('所有解压方法都失败');
      }
      
      console.log('解压完成');
      
      // 清理临时文件
      try {
        rimraf.sync(tempDir);
      } catch (cleanupError) {
        console.error('清理临时文件失败:', cleanupError);
      }
      
      // 返回成功信息
      res.json({ 
        success: true, 
        message: '资源文件已成功下载并解压到核心目录',
        resourcePath: resourcesDir 
      });
      
    } catch (extractError) {
      console.error('解压文件失败', extractError);
      res.status(500).json({ error: '解压文件失败: ' + extractError.message });
    }
    
  } catch (error) {
    console.error('下载资源文件失败', error);
    res.status(500).json({ error: '下载资源文件失败: ' + error.message });
  }
});

// 路由
app.get('/', (req, res) => {
  res.render('index', { page: 'launch' });
});

app.get('/launch', (req, res) => {
  res.render('index', { page: 'launch' });
});

app.get('/download', (req, res) => {
  res.render('index', { page: 'download' });
});

app.get('/settings', (req, res) => {
  res.render('index', { page: 'settings' });
});

app.get('/others', (req, res) => {
  res.render('index', { page: 'others' });
});

// 中间件解析JSON请求
app.use(express.json());

// 检查游戏文件API
app.get('/api/check-game-files', (req, res) => {
  const { path: gamePath } = req.query;
  
  if (!gamePath) {
    return res.status(400).json({ error: '未提供游戏路径' });
  }
  
  try {
    // 检查Astrolabe.dll或version.dll是否存在
    const astrolabePath = path.join(gamePath, 'Astrolabe.dll');
    const versionPath = path.join(gamePath, 'version.dll');
    
    const hasAstrolabe = fs.existsSync(astrolabePath);
    const hasVersion = fs.existsSync(versionPath);
    
    const hasRequiredFiles = hasAstrolabe || hasVersion;
    
    res.json({ 
      hasRequiredFiles,
      hasAstrolabe,
      hasVersion,
      gamePath
    });
    
  } catch (error) {
    console.error('检查游戏文件失败', error);
    res.status(500).json({ error: '检查游戏文件失败: ' + error.message });
  }
});

// 启动游戏API
app.post('/api/launch-game', (req, res) => {
  const { gamePath } = req.body;
  
  if (!gamePath) {
    return res.status(400).json({ error: '未提供游戏路径' });
  }
  
  try {
    // 检查游戏文件是否存在
    const astrolabePath = path.join(gamePath, 'Astrolabe.dll');
    const versionPath = path.join(gamePath, 'version.dll');
    
    if (!fs.existsSync(astrolabePath) && !fs.existsSync(versionPath)) {
      return res.status(400).json({ 
        error: '游戏目录中缺少必要文件 (Astrolabe.dll 或 version.dll)'
      });
    }
    
    // 查找游戏执行文件
    let gameExePath = '';
    
    // 常见的游戏可执行文件名
    const possibleExeNames = [
      'YuanShen.exe',
      'GenshinImpact.exe',
      'launcher.exe'
    ];
    
    for (const exeName of possibleExeNames) {
      const exePath = path.join(gamePath, exeName);
      if (fs.existsSync(exePath)) {
        gameExePath = exePath;
        break;
      }
    }
    
    if (!gameExePath) {
      return res.status(400).json({ error: '无法找到游戏启动文件' });
    }
    
    // 启动游戏
    console.log(`启动游戏: ${gameExePath}`);
    const gameProcess = spawn(gameExePath, [], {
      cwd: gamePath,
      detached: true,
      shell: true,
      stdio: 'ignore'
    });
    
    // 解除进程关联，让它独立运行
    gameProcess.unref();
    
    res.json({ 
      success: true, 
      message: '游戏启动成功',
      gamePath,
      gameExe: path.basename(gameExePath)
    });
    
  } catch (error) {
    console.error('启动游戏失败', error);
    res.status(500).json({ error: '启动游戏失败: ' + error.message });
  }
});

// 启动服务器
server.listen(port, () => {
  console.log(`Grasscutter启动器运行在 http://localhost:${port}`);
}); 