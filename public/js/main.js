// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 首先加载保存的设置并应用
  const settingsJson = localStorage.getItem('launcherSettings');
  if (settingsJson) {
    try {
      const settings = JSON.parse(settingsJson);
      // 立即应用主题，即使不在设置页面
      applyTheme(settings.appTheme);
      
      // 应用动画设置
      document.body.classList.toggle('no-animations', !settings.enableAnimations);
      
      // 应用紧凑模式
      document.body.classList.toggle('compact-mode', !!settings.compactMode);
      
      // 根据设置显示默认标签页
      if (settings.startupTab && settings.startupTab !== 'launch') {
        const currentTab = window.location.pathname.substring(1) || 'launch';
        // 如果当前不在首页，不切换标签页
        if (currentTab === 'launch') {
          setTimeout(() => {
            const startupTab = document.querySelector(`.nav-link[href="/${settings.startupTab}"]`);
            if (startupTab) {
              startupTab.click();
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('应用设置失败', error);
    }
  }
  
  // 启动页面功能
  initLaunchPage();
  
  // 下载页面功能
  initDownloadPage();
  
  // 设置页面功能
  initSettingsPage();
  
  // 其他页面功能
  initOthersPage();

  // 初始化选项卡
  initTabs();

  // 加载下载数据
  loadDownloadData();
  
  // 加载服务器资源数据
  loadResDownloadData();
  
  // 加载核心列表
  loadCoresList();
  
  // 检查是否需要检查更新
  const settings = localStorage.getItem('launcherSettings');
  if (settings) {
    const parsedSettings = JSON.parse(settings);
    if (parsedSettings.autoCheckUpdates !== false) {
      // 这里可以添加检查更新的逻辑
      console.log('自动检查更新已启用');
    }
  }
});

// 从服务器加载下载数据
async function loadDownloadData() {
  const serverCardContainer = document.getElementById('server-download-cards');
  if (!serverCardContainer) return;

  // 显示加载中
  serverCardContainer.innerHTML = `
    <div class="download-loading">
      <div class="loading-spinner"></div>
      <p>正在加载下载资源...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/downloads');
    const data = await response.json();
    
    // 清除加载提示
    serverCardContainer.innerHTML = '';
    
    // 添加每个下载项
    data.forEach(item => {
      const card = createDownloadCard(item);
      serverCardContainer.appendChild(card);
    });
    
    // 添加自定义下载源
    const customDownloads = JSON.parse(localStorage.getItem('customDownloads') || '[]');
    if (customDownloads.length > 0) {
      const divider = document.createElement('div');
      divider.className = 'download-divider';
      divider.innerHTML = '<span>自定义下载源</span>';
      serverCardContainer.appendChild(divider);
      
      customDownloads.forEach(item => {
        const card = createDownloadCard(item);
        serverCardContainer.appendChild(card);
      });
    }
    
    // 初始化下载按钮
    initDownloadPage();
    
  } catch (error) {
    console.error('获取下载数据失败:', error);
    serverCardContainer.innerHTML = `
      <div class="download-error">
        <h4>无法获取下载数据</h4>
        <p>获取下载资源时出现错误。请稍后再试。</p>
      </div>
    `;
  }
}

// 从服务器加载服务器资源数据
async function loadResDownloadData() {
  const resCardContainer = document.getElementById('res-download-cards');
  if (!resCardContainer) return;

  // 显示加载中
  resCardContainer.innerHTML = `
    <div class="download-loading">
      <div class="loading-spinner"></div>
      <p>正在加载资源文件...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/res-downloads');
    const data = await response.json();
    
    // 清除加载提示
    resCardContainer.innerHTML = '';
    
    // 添加每个下载项
    data.forEach(item => {
      const card = createResDownloadCard(item);
      resCardContainer.appendChild(card);
    });
    
  } catch (error) {
    console.error('获取服务器资源数据失败:', error);
    resCardContainer.innerHTML = `
      <div class="download-error">
        <h4>无法获取服务器资源数据</h4>
        <p>获取资源文件时出现错误。请稍后再试。</p>
      </div>
    `;
  }
}

// 创建下载卡片
function createDownloadCard(data) {
  // 使用模板
  const template = document.getElementById('download-card-template');
  const card = document.importNode(template.content, true).firstElementChild;
  
  // 填充数据
  card.querySelector('.download-name').textContent = data.name || 'Unknown';
  
  // 提取版本号，如果名称中包含版本信息
  const versionMatch = data.name ? data.name.match(/v?(\d+\.\d+(\.\d+)?)/) : null;
  const version = versionMatch ? versionMatch[0] : '';
  
  card.querySelector('.version-badge').textContent = version || '未知版本';
  card.querySelector('.download-description').textContent = data.description || '无描述';
  
  // 设置下载按钮
  const downloadButton = card.querySelector('.download-btn');
  
  // 如果是Grasscutter核心，使用本地下载
  if (data.name && data.name.includes('Grasscutter') && data.url) {
    downloadButton.href = 'javascript:void(0)';
    downloadButton.setAttribute('data-url', data.url);
    downloadButton.setAttribute('data-name', data.name);
    downloadButton.setAttribute('data-is-core', 'true');
    
    // 移除target="_blank"属性
    downloadButton.removeAttribute('target');
  } else if (data.url) {
    downloadButton.href = data.url || '#';
    downloadButton.target = '_blank';
  } else {
    // 如果没有URL，禁用按钮
    downloadButton.classList.add('disabled');
    downloadButton.disabled = true;
    downloadButton.href = 'javascript:void(0)';
  }
  
  // 假设文件大小，实际情况应该从服务器获取
  card.querySelector('.file-size').textContent = '点击下载';
  
  return card;
}

// 创建资源下载卡片
function createResDownloadCard(data) {
  // 使用模板
  const template = document.getElementById('download-card-template');
  const card = document.importNode(template.content, true).firstElementChild;
  
  // 填充数据
  card.querySelector('.download-name').textContent = data.name || 'Unknown';
  
  // 提取版本号，如果名称中包含版本信息
  const versionMatch = data.name ? data.name.match(/v?(\d+\.\d+(\.\d+)?)/) : null;
  const version = versionMatch ? versionMatch[0] : '';
  
  card.querySelector('.version-badge').textContent = version || data.name.match(/\d+\.\d+/) || '未知版本';
  card.querySelector('.download-description').textContent = data.description || '无描述';
  
  // 设置下载按钮
  const downloadButton = card.querySelector('.download-btn');
  
  // 设置为资源下载
  downloadButton.href = 'javascript:void(0)';
  downloadButton.setAttribute('data-url', data.url);
  downloadButton.setAttribute('data-name', data.name);
  downloadButton.setAttribute('data-is-res', 'true');
  
  // 移除target="_blank"属性
  downloadButton.removeAttribute('target');
  
  // 假设文件大小，实际情况应该从服务器获取
  card.querySelector('.file-size').textContent = '点击下载';
  
  // 添加点击事件
  downloadButton.addEventListener('click', showCoreSelectionModal);
  
  return card;
}

// 显示核心选择模态框
function showCoreSelectionModal(e) {
  e.preventDefault();
  
  const url = this.getAttribute('data-url');
  const name = this.getAttribute('data-name');
  
  if (!url || !name) {
    alert('下载信息不完整');
    return;
  }
  
  // 获取已安装的核心列表
  fetch('/api/cores')
    .then(response => response.json())
    .then(cores => {
      // 如果没有可用核心
      if (!cores || cores.length === 0) {
        alert('没有找到已安装的核心，请先下载并安装Grasscutter核心。');
        return;
      }
      
      // 创建模态框
      let modalHTML = `
        <div class="modal" id="core-selection-modal">
          <div class="modal-content">
            <div class="modal-header">
              <h3>选择目标核心</h3>
              <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
              <p>请选择要将资源文件 <strong>${name}</strong> 下载到哪个核心目录：</p>
              <div class="cores-list modal-cores-list">
      `;
      
      // 添加核心选项
      cores.forEach((core, index) => {
        modalHTML += `
          <div class="core-item">
            <input type="radio" name="target-core" id="target-core-${index}" value="${core.path}" ${index === 0 ? 'checked' : ''}>
            <label for="target-core-${index}">${core.name} (${core.jarFile})</label>
          </div>
        `;
      });
      
      modalHTML += `
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary close-modal-btn">取消</button>
                <button type="button" class="btn btn-primary" id="download-res-btn">下载并安装</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // 添加模态框到页面
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHTML;
      document.body.appendChild(modalContainer.firstElementChild);
      
      // 获取模态框
      const modal = document.getElementById('core-selection-modal');
      
      // 显示模态框
      modal.classList.add('show');
      
      // 关闭按钮事件
      const closeButtons = modal.querySelectorAll('.close-modal, .close-modal-btn');
      closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          document.body.removeChild(modal);
        });
      });
      
      // 点击模态框外部关闭
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
      
      // 下载按钮事件
      const downloadBtn = document.getElementById('download-res-btn');
      downloadBtn.addEventListener('click', () => {
        const selectedCore = modal.querySelector('input[name="target-core"]:checked');
        
        if (!selectedCore) {
          alert('请选择一个核心');
          return;
        }
        
        // 显示下载中状态
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
          下载中...
        `;
        
        // 添加旋转动画
        const spinner = downloadBtn.querySelector('.spinner');
        spinner.style.animation = 'spin 1s linear infinite';
        
        // 调用API下载资源
        downloadResFile(url, name, selectedCore.value, modal);
      });
    })
    .catch(error => {
      console.error('获取核心列表失败', error);
      alert('获取核心列表失败，请稍后再试');
    });
}

// 下载资源文件
async function downloadResFile(url, name, corePath, modal) {
  try {
    const response = await fetch(`/api/download-res?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}&corePath=${encodeURIComponent(corePath)}`);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // 关闭模态框
    document.body.removeChild(modal);
    
    // 显示成功消息
    alert(`资源文件 ${name} 已成功下载并安装到核心目录`);
    
  } catch (error) {
    console.error('下载资源文件失败', error);
    
    // 恢复下载按钮
    const downloadBtn = document.getElementById('download-res-btn');
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '下载并安装';
    }
    
    // 显示错误消息
    alert(`下载失败: ${error.message}`);
  }
}

// 初始化选项卡功能
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabSlider = document.querySelector('.tab-slider');
  
  if (!tabs.length || !tabSlider) return;
  
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', function() {
      // 计算滑块位置 - 根据选项卡数量调整百分比
      const tabCount = tabs.length;
      const tabWidth = 100 / tabCount;
      tabSlider.style.left = `${index * tabWidth}%`;
      
      // 更新活动标签
      document.querySelector('.tab.active').classList.remove('active');
      this.classList.add('active');
      
      // 显示内容
      const tabId = this.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });
      document.getElementById(`${tabId}-tab`).style.display = 'block';
    });
  });
}

// 初始化启动页面功能
function initLaunchPage() {
  const startBtn = document.querySelector('.start-btn');
  const stopBtn = document.querySelector('.stop-btn');
  const restartBtn = document.querySelector('.restart-btn');
  const launchGameBtn = document.querySelector('.launch-game-btn'); // 新增启动游戏按钮
  const statusIcon = document.querySelector('.status-icon');
  const statusText = document.querySelector('.status-text');
  const logContent = document.querySelector('.log-content');
  const statBars = document.querySelectorAll('.stat-bar');
  const statValues = document.querySelectorAll('.stat-value');
  const clearLogsBtn = document.querySelector('.clear-logs');
  const exportLogsBtn = document.querySelector('.export-logs');
  const statusValues = document.querySelectorAll('.status-item .value');
  
  if (!startBtn) return; // 不在启动页面
  
  // 检查游戏路径和关键文件
  function checkGamePathAndFiles() {
    // 从本地存储中获取游戏路径
    const settingsJson = localStorage.getItem('launcherSettings');
    if (!settingsJson) {
      launchGameBtn.disabled = true;
      launchGameBtn.title = '未设置游戏路径';
      return false;
    }
    
    const settings = JSON.parse(settingsJson);
    const gameFolder = settings.gameFolder;
    
    if (!gameFolder) {
      launchGameBtn.disabled = true;
      launchGameBtn.title = '未设置游戏路径';
      return false;
    }
    
    // 通过API检查文件是否存在
    fetch(`/api/check-game-files?path=${encodeURIComponent(gameFolder)}`)
      .then(response => response.json())
      .then(data => {
        if (data.hasRequiredFiles) {
          launchGameBtn.disabled = false;
          launchGameBtn.title = '启动游戏';
        } else {
          launchGameBtn.disabled = true;
          launchGameBtn.title = '游戏目录中缺少必要文件 (Astrolabe.dll 或 version.dll)';
        }
      })
      .catch(error => {
        console.error('检查游戏文件失败', error);
        launchGameBtn.disabled = true;
        launchGameBtn.title = '无法验证游戏文件';
      });
  }
  
  // 页面加载时检查游戏路径
  checkGamePathAndFiles();
  
  // 实现启动游戏按钮点击事件
  if (launchGameBtn) {
    launchGameBtn.addEventListener('click', async function() {
      // 获取游戏路径
      const settingsJson = localStorage.getItem('launcherSettings');
      if (!settingsJson) {
        showToast('未找到游戏路径设置', 'error');
        return;
      }
      
      const settings = JSON.parse(settingsJson);
      const gameFolder = settings.gameFolder;
      
      if (!gameFolder) {
        showToast('请先在设置中配置游戏安装目录', 'error');
        return;
      }
      
      try {
        // 调用启动游戏API
        const response = await fetch('/api/launch-game', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ gamePath: gameFolder })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '启动游戏失败');
        }
        
        addLogEntry('正在启动游戏...');
        showToast('游戏启动命令已发送', 'success');
        
      } catch (error) {
        console.error('启动游戏失败', error);
        addLogEntry(`启动游戏失败: ${error.message}`);
        showToast(`启动游戏失败: ${error.message}`, 'error');
      }
    });
  }
  
  // 模拟启动服务器
  startBtn.addEventListener('click', function() {
    // 获取选择的核心
    const selectedCore = document.querySelector('input[name="selected-core"]:checked');
    
    // 如果没有核心被选择，显示错误
    if (!selectedCore) {
      alert('请先选择一个核心或下载核心');
      return;
    }
    
    // 检查核心资源
    checkCoreResources(selectedCore.value).then(async () => {
      // 如果启动按钮被禁用，说明资源检查失败
      if (startBtn.disabled) {
        return;
      }
      
      // 禁用按钮，显示加载状态
      startBtn.disabled = true;
      startBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
        启动中...
      `;
      const spinner = startBtn.querySelector('.spinner');
      spinner.style.animation = 'spin 1s linear infinite';
      
      try {
        // 调用启动服务器API
        const response = await fetch(`/api/server/start?corePath=${encodeURIComponent(selectedCore.value)}`, {
          method: 'POST'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '启动服务器失败');
        }
        
        // 启动成功，更改状态
        statusIcon.classList.remove('offline');
        statusIcon.classList.add('online');
        statusIcon.style.backgroundColor = 'var(--success-color)';
        statusText.textContent = '在线';
        
        // 启用/禁用按钮
        startBtn.disabled = true;
        stopBtn.disabled = false;
        restartBtn.disabled = false;
        
        // 如果有游戏路径且存在必要文件，启用启动游戏按钮
        if (launchGameBtn && launchGameBtn.title !== '游戏目录中缺少必要文件 (Astrolabe.dll 或 version.dll)' && launchGameBtn.title !== '未设置游戏路径') {
          launchGameBtn.disabled = false;
        }
        
        // 还原按钮文本
        startBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          启动服务器
        `;
        
        // 更新状态详情
        statusValues[0].textContent = '00:00:01';
        statusValues[1].textContent = '256 MB';
        
        // 添加日志条目
        const corePath = selectedCore.value;
        const coreName = selectedCore.nextElementSibling.textContent;
        
        addLogEntry(`正在启动服务器，使用核心: ${coreName}...`);
        addLogEntry(`核心路径: ${corePath}`);
        addLogEntry('正在启动MongoDB...');
        setTimeout(() => addLogEntry('MongoDB已启动，端口 27017'), 500);
        setTimeout(() => addLogEntry('正在加载配置文件...'), 1000);
        setTimeout(() => addLogEntry('初始化数据库连接...'), 1500);
        setTimeout(() => addLogEntry('服务器已启动，监听端口'), 2000);
        
        // 开始轮询服务器状态
        startStatusPolling();
        
      } catch (error) {
        console.error('启动服务器失败', error);
        
        // 恢复按钮状态
        startBtn.disabled = false;
        startBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          启动服务器
        `;
        
        // 添加错误日志
        addLogEntry(`启动服务器失败: ${error.message}`);
        
        // 显示错误消息
        alert(`启动服务器失败: ${error.message}`);
      }
    });
  });
  
  // 模拟停止服务器
  stopBtn.addEventListener('click', async function() {
    // 禁用按钮，显示加载状态
    stopBtn.disabled = true;
    stopBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
      停止中...
    `;
    const spinner = stopBtn.querySelector('.spinner');
    spinner.style.animation = 'spin 1s linear infinite';
    
    try {
      // 调用停止服务器API
      const response = await fetch('/api/server/stop', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '停止服务器失败');
      }
      
      // 停止轮询
      stopStatusPolling();
      
      // 停止成功，更改状态
      statusIcon.classList.remove('online');
      statusIcon.classList.add('offline');
      statusIcon.style.backgroundColor = 'var(--danger-color)';
      statusText.textContent = '离线';
      
      // 启用/禁用按钮
      startBtn.disabled = false;
      stopBtn.disabled = true;
      restartBtn.disabled = true;
      
      // 检查是否有启动游戏按钮，并根据游戏文件检查结果设置状态
      if (launchGameBtn) {
        // 需要重新检查游戏文件，因为服务器停止后可能需要额外检查
        checkGamePathAndFiles();
      }
      
      // 还原按钮文本
      stopBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
        停止服务器
      `;
      
      // 复位状态详情
      statusValues[0].textContent = '--:--:--';
      statusValues[1].textContent = '-- MB';
      
      // 复位统计数据
      statBars.forEach(bar => bar.style.width = '0%');
      statValues[0].textContent = '0%';
      statValues[1].textContent = '0 MB';
      
      // 添加日志条目
      addLogEntry('正在停止服务器...');
      setTimeout(() => addLogEntry('关闭数据库连接...'), 500);
      setTimeout(() => addLogEntry('停止MongoDB服务...'), 1000);
      setTimeout(() => addLogEntry('服务器已停止'), 1500);
      
    } catch (error) {
      console.error('停止服务器失败', error);
      
      // 恢复按钮状态，但假设服务器已停止
      startBtn.disabled = false;
      stopBtn.disabled = true;
      restartBtn.disabled = true;
      
      // 还原按钮文本
      stopBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
        停止服务器
      `;
      
      // 更改状态以防万一
      statusIcon.classList.remove('online');
      statusIcon.classList.add('offline');
      statusIcon.style.backgroundColor = 'var(--danger-color)';
      statusText.textContent = '离线';
      
      // 添加错误日志
      addLogEntry(`停止服务器失败: ${error.message}`);
      
      // 显示错误消息
      alert(`停止服务器失败: ${error.message}`);
    }
  });
  
  // 模拟重启服务器
  restartBtn.addEventListener('click', async function() {
    // 获取选择的核心
    const selectedCore = document.querySelector('input[name="selected-core"]:checked');
    
    // 如果没有核心被选择，显示错误
    if (!selectedCore) {
      alert('请先选择一个核心或下载核心');
      return;
    }
    
    // 禁用按钮，显示加载状态
    restartBtn.disabled = true;
    restartBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
      重启中...
    `;
    const spinner = restartBtn.querySelector('.spinner');
    spinner.style.animation = 'spin 1s linear infinite';
    
    try {
      // 调用重启服务器API
      const response = await fetch(`/api/server/restart?corePath=${encodeURIComponent(selectedCore.value)}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '重启服务器失败');
      }
      
      // 重启成功，更改状态
      statusIcon.classList.remove('offline');
      statusIcon.classList.add('online');
      statusIcon.style.backgroundColor = 'var(--success-color)';
      statusText.textContent = '在线';
      
      // 启用/禁用按钮
      startBtn.disabled = true;
      stopBtn.disabled = false;
      restartBtn.disabled = false;
      
      // 还原按钮文本
      restartBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        重启服务器
      `;
      
      // 添加日志条目
      addLogEntry('正在重启服务器...');
      setTimeout(() => addLogEntry('关闭数据库连接...'), 300);
      setTimeout(() => addLogEntry('停止服务...'), 600);
      setTimeout(() => addLogEntry('停止MongoDB服务...'), 900);
      setTimeout(() => addLogEntry('重新启动MongoDB...'), 1200);
      setTimeout(() => addLogEntry('重新加载配置...'), 1500);
      setTimeout(() => addLogEntry('重新初始化数据库连接...'), 1800);
      setTimeout(() => addLogEntry('服务器已重启'), 2100);
      
      // 开始或重启状态轮询
      startStatusPolling();
      
    } catch (error) {
      console.error('重启服务器失败', error);
      
      // 恢复按钮状态
      startBtn.disabled = false;
      stopBtn.disabled = true;
      restartBtn.disabled = true;
      
      // 还原按钮文本
      restartBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        重启服务器
      `;
      
      // 更改状态
      statusIcon.classList.remove('online');
      statusIcon.classList.add('offline');
      statusIcon.style.backgroundColor = 'var(--danger-color)';
      statusText.textContent = '离线';
      
      // 添加错误日志
      addLogEntry(`重启服务器失败: ${error.message}`);
      
      // 显示错误消息
      alert(`重启服务器失败: ${error.message}`);
    }
  });

  // 状态轮询
  let statusPollingInterval = null;
  
  function startStatusPolling() {
    // 先清除可能存在的轮询
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
    }
    
    // 立即检查一次状态
    checkServerStatus();
    
    // 每2秒检查一次服务器状态
    statusPollingInterval = setInterval(checkServerStatus, 2000);
  }
  
  function stopStatusPolling() {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
    }
  }
  
  async function checkServerStatus() {
    try {
      const response = await fetch('/api/server/status');
      const data = await response.json();
      
      // 更新状态
      if (data.running) {
        statusIcon.classList.remove('offline');
        statusIcon.classList.add('online');
        statusIcon.style.backgroundColor = 'var(--success-color)';
        statusText.textContent = '在线';
        
        // 启用/禁用按钮
        startBtn.disabled = true;
        stopBtn.disabled = false;
        restartBtn.disabled = false;
        
        // 如果有游戏路径且存在必要文件，启用启动游戏按钮
        const launchGameBtn = document.querySelector('.launch-game-btn');
        if (launchGameBtn && launchGameBtn.title !== '游戏目录中缺少必要文件 (Astrolabe.dll 或 version.dll)' && launchGameBtn.title !== '未设置游戏路径') {
          launchGameBtn.disabled = false;
        }
        
        // 如果服务器在线，获取资源使用情况
        fetchResourceUsage();
        
        // 如果这是第一次检测到服务器在线
        if (!isServerRunning) {
          isServerRunning = true;
          startTime = new Date();
          
          // 添加日志
          addLogEntry('检测到服务器运行中');
          
          // 开始定时更新运行时间
          runningTimeInterval = setInterval(updateRunningTime, 1000);
        }
      } else {
        statusIcon.classList.remove('online');
        statusIcon.classList.add('offline');
        statusIcon.style.backgroundColor = 'var(--danger-color)';
        statusText.textContent = '离线';
        
        // 启用/禁用按钮
        startBtn.disabled = false;
        stopBtn.disabled = true;
        restartBtn.disabled = true;
        
        // 检查是否有启动游戏按钮，并根据游戏文件检查结果设置状态
        const launchGameBtn = document.querySelector('.launch-game-btn');
        if (launchGameBtn) {
          // 如果服务器离线，需要额外检查游戏文件
          if (typeof checkGamePathAndFiles === 'function') {
            checkGamePathAndFiles();
          }
        }
        
        // 如果之前服务器在运行，现在停止了
        if (isServerRunning) {
          isServerRunning = false;
          
          // 停止运行时间更新
          clearInterval(runningTimeInterval);
          
          // 复位显示
          resetResourceDisplay();
          
          // 添加日志
          addLogEntry('服务器已停止');
        }
      }
    } catch (error) {
      console.error('检查服务器状态失败', error);
      
      // 对于错误情况，假设服务器已停止
      statusIcon.classList.remove('online');
      statusIcon.classList.add('offline');
      statusIcon.style.backgroundColor = 'var(--danger-color)';
      statusText.textContent = '离线';
      
      // 启用/禁用按钮
      startBtn.disabled = false;
      stopBtn.disabled = true;
      restartBtn.disabled = true;
      
      // 检查游戏按钮
      const launchGameBtn = document.querySelector('.launch-game-btn');
      if (launchGameBtn) {
        if (typeof checkGamePathAndFiles === 'function') {
          checkGamePathAndFiles();
        }
      }
      
      // 如果之前服务器在运行，现在停止了
      if (isServerRunning) {
        isServerRunning = false;
        
        // 停止运行时间更新
        clearInterval(runningTimeInterval);
        
        // 复位显示
        resetResourceDisplay();
        
        // 添加日志
        addLogEntry('服务器状态检查错误，假设已停止');
      }
    }
  }
  
  // 获取资源使用情况
  async function fetchResourceUsage() {
    try {
      const response = await fetch('/api/server/resources');
      const data = await response.json();
      
      // 更新资源显示
      updateResourceDisplay(data);
    } catch (error) {
      console.error('获取资源使用情况失败', error);
    }
  }
  
  // 更新资源显示
  function updateResourceDisplay(data) {
    const cpuValue = statValues[0];
    const memoryValue = statValues[1];
    const cpuBar = statBars[0];
    const memoryBar = statBars[1];
    
    if (!cpuValue || !memoryValue || !cpuBar || !memoryBar) return;
    
    try {
      // 更新CPU使用率
      const cpuUsage = data.cpu || 0;
      cpuValue.textContent = `${cpuUsage}%`;
      cpuBar.style.width = `${Math.min(cpuUsage, 100)}%`;
      
      // 更新内存使用
      const memoryUsage = data.memory || 0;
      memoryValue.textContent = `${memoryUsage} MB`;
      
      // 假设最大内存为8GB，计算百分比
      const memoryPercentage = data.memoryRaw ? (data.memoryRaw / (8 * 1024 * 1024 * 1024)) * 100 : 0;
      memoryBar.style.width = `${Math.min(memoryPercentage, 100)}%`;
      
      // 更新运行时间
      updateRunningTime();
    } catch (error) {
      console.error('更新资源显示失败', error);
      // 发生错误时不更新UI
    }
  }
  
  // 重置资源显示
  function resetResourceDisplay() {
    const cpuValue = statValues[0];
    const memoryValue = statValues[1];
    const cpuBar = statBars[0];
    const memoryBar = statBars[1];
    
    if (!cpuValue || !memoryValue || !cpuBar || !memoryBar) return;
    
    cpuValue.textContent = '0%';
    memoryValue.textContent = '0 MB';
    cpuBar.style.width = '0%';
    memoryBar.style.width = '0%';
    
    // 重置运行时间
    statusValues[0].textContent = '--:--:--';
  }
  
  // 服务器启动时间
  let serverStartTime = null;
  
  // 更新运行时间
  function updateRunningTime() {
    if (!serverStartTime) {
      serverStartTime = new Date();
    }
    
    const now = new Date();
    const diff = now - serverStartTime;
    
    // 转换为小时:分钟:秒格式
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    // 格式化为HH:MM:SS
    const timeString = [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
    
    statusValues[0].textContent = timeString;
  }
  
  // 初始检查服务器状态
  checkServerStatus();
  
  // 清除日志
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', function() {
      logContent.innerHTML = '';
      addLogEntry('日志已清除');
    });
  }
  
  // 导出日志
  if (exportLogsBtn) {
    exportLogsBtn.addEventListener('click', function() {
      // 获取选择的核心
      const selectedCore = document.querySelector('input[name="selected-core"]:checked');
      
      // 如果没有核心被选择，显示错误
      if (!selectedCore) {
        alert('请先选择一个核心');
        return;
      }
      
      // 获取核心目录
      const corePath = selectedCore.value;
      const coreDir = corePath.substring(0, corePath.lastIndexOf('\\') + 1);
      const coreName = selectedCore.nextElementSibling.textContent;
      
      // 模拟导出日志
      addLogEntry('正在导出日志...');
      setTimeout(() => {
        const exportPath = `${coreDir}grasscutter_log.txt`;
        addLogEntry(`日志已导出到 ${exportPath}`);
        alert(`日志已成功导出到核心目录：\n${exportPath}`);
      }, 500);
    });
  }
  
  // 添加日志条目函数
  function addLogEntry(message) {
    const entry = document.createElement('p');
    entry.className = 'log-entry';
    entry.textContent = `[${getCurrentTime()}] ${message}`;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
  }
  
  // 获取当前时间
  function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }
}

// 初始化下载页面功能
function initDownloadPage() {
  const downloadButtons = document.querySelectorAll('.download-btn');
  const addCustomDownloadBtn = document.querySelector('.add-custom-download');
  const refreshDownloadsBtn = document.querySelector('.refresh-downloads');
  const refreshResDownloadsBtn = document.querySelector('.refresh-res-downloads');
  const modal = document.getElementById('add-download-modal');
  const closeModalBtns = document.querySelectorAll('.close-modal, .close-modal-btn');
  const addDownloadForm = document.getElementById('add-download-form');
  
  // 本地存储的自定义下载源
  let customDownloads = JSON.parse(localStorage.getItem('customDownloads') || '[]');
  
  // 初始化下载按钮
  if (downloadButtons.length) {
    initDownloadButtons();
  }
  
  // 添加自定义下载源按钮
  if (addCustomDownloadBtn) {
    addCustomDownloadBtn.addEventListener('click', () => {
      modal.classList.add('show');
    });
  }
  
  // 刷新下载列表按钮
  if (refreshDownloadsBtn) {
    refreshDownloadsBtn.addEventListener('click', () => {
      loadDownloadData();
    });
  }
  
  // 刷新服务器资源列表按钮
  if (refreshResDownloadsBtn) {
    refreshResDownloadsBtn.addEventListener('click', () => {
      loadResDownloadData();
    });
  }
  
  // 关闭模态框
  if (closeModalBtns.length) {
    closeModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.remove('show');
      });
    });
  }
  
  // 点击模态框外部关闭
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  }
  
  // 添加自定义下载源表单提交
  if (addDownloadForm) {
    addDownloadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // 获取表单数据
      const name = document.getElementById('download-name').value;
      const description = document.getElementById('download-description').value;
      const url = document.getElementById('download-url').value;
      
      // 创建新的下载源
      const newDownload = { name, description, url };
      
      // 添加到本地存储
      customDownloads.push(newDownload);
      localStorage.setItem('customDownloads', JSON.stringify(customDownloads));
      
      // 添加到界面
      const serverCardContainer = document.getElementById('server-download-cards');
      if (serverCardContainer) {
        const card = createDownloadCard(newDownload);
        serverCardContainer.appendChild(card);
        initDownloadButton(card.querySelector('.download-btn'));
      }
      
      // 重置表单并关闭模态框
      addDownloadForm.reset();
      modal.classList.remove('show');
    });
  }
  
  function initDownloadButtons() {
    downloadButtons.forEach(btn => {
      initDownloadButton(btn);
    });
  }
  
  function initDownloadButton(btn) {
    if (!btn.hasAttribute('data-initialized')) {
      btn.setAttribute('data-initialized', 'true');
      btn.addEventListener('click', handleDownloadClick);
    }
  }
  
  async function handleDownloadClick(e) {
    // 检查是否是核心下载
    const isCore = this.getAttribute('data-is-core') === 'true';
    
    // 如果是核心，使用本地下载API
    if (isCore) {
      e.preventDefault();
      
      // 已经在下载中
      if (this.textContent.includes('下载中')) return;
      
      const card = this.closest('.download-card');
      const progressBar = card.querySelector('.progress');
      const url = this.getAttribute('data-url');
      const name = this.getAttribute('data-name');
      
      // 生成唯一客户端ID
      const clientId = 'client-' + Date.now();
      
      // 创建或获取下载状态显示容器
      let statusElement = card.querySelector('.download-status');
      if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'download-status';
        card.appendChild(statusElement);
      }
      
      // 创建进度详情元素
      let progressDetails = card.querySelector('.progress-details');
      if (!progressDetails) {
        progressDetails = document.createElement('div');
        progressDetails.className = 'progress-details';
        card.insertBefore(progressDetails, statusElement);
      }
      
      // 更改按钮文本和禁用
      const originalText = this.innerHTML;
      this.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
        准备下载...
      `;
      
      // 添加旋转动画
      const spinner = this.querySelector('.spinner');
      spinner.style.animation = 'spin 1s linear infinite';
      
      // 创建WebSocket连接
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${wsProtocol}//${window.location.host}?clientId=${clientId}`);
      
      let downloadStartTime = null;
      let fileSize = 0;
      
      // 处理WebSocket消息
      socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          case 'download_start':
            downloadStartTime = Date.now();
            fileSize = data.totalSize;
            statusElement.textContent = '初始化下载...';
            progressBar.style.width = '0%';
            break;
            
          case 'download_progress':
            // 更新进度条 - 现在下载只占总进度的70%
            progressBar.style.width = `${data.progress}%`;
            
            // 计算剩余时间
            const elapsedMs = Date.now() - downloadStartTime;
            const progress = data.downloaded / data.total;
            const estimatedTotalMs = progress > 0 ? elapsedMs / progress : 0;
            const remainingMs = estimatedTotalMs - elapsedMs;
            
            // 格式化时间和大小
            const remainingTime = formatTime(remainingMs);
            const downloadedSize = formatSize(data.downloaded);
            const totalSize = formatSize(data.total);
            const speed = formatSpeed(data.speed);
            
            // 更新状态显示
            statusElement.textContent = `下载中: ${Math.floor(progress * 100)}%（总进度: ${data.progress}%）`;
            progressDetails.innerHTML = `
              <div class="detail-row">
                <span>速度: ${speed}</span>
                <span>剩余时间: ${remainingTime}</span>
              </div>
              <div class="detail-row">
                <span>${downloadedSize} / ${totalSize}</span>
              </div>
              <div class="detail-row">
                <span>阶段: 1/3 (下载文件)</span>
              </div>
            `;
            break;
            
          case 'merging_start':
            progressBar.style.width = `${data.progress || 70}%`;
            statusElement.textContent = '合并文件中...（总进度: 70-80%）';
            progressDetails.innerHTML = `
              <div class="detail-row">
                <span>正在处理下载的文件片段...</span>
              </div>
              <div class="detail-row">
                <span>阶段: 2/3 (合并片段)</span>
              </div>
            `;
            break;
            
          case 'extracting_start':
            progressBar.style.width = `${data.progress || 80}%`;
            statusElement.textContent = '准备基础数据文件...（总进度: 80-100%）';
            progressDetails.innerHTML = `
              <div class="detail-row">
                <span>${data.message || '准备中'}</span>
              </div>
              <div class="detail-row">
                <span>阶段: 3/3 (准备基础数据)</span>
              </div>
            `;
            break;
            
          case 'extracting_progress':
            // 显示解压进度
            if (data.progress) {
              progressBar.style.width = `${data.progress}%`;
              statusElement.textContent = `准备基础数据：${data.progress < 100 ? '进行中' : '完成'}（总进度: ${data.progress}%）`;
            } else {
              statusElement.textContent = '准备基础数据中...';
            }
            
            progressDetails.innerHTML = `
              <div class="detail-row">
                <span>${data.message || '处理中'}</span>
              </div>
              ${data.fileName ? `<div class="detail-row"><span>当前文件: ${data.fileName}</span></div>` : ''}
              <div class="detail-row">
                <span>阶段: 3/3 (准备基础数据)</span>
              </div>
            `;
            break;
            
          case 'extracting_complete':
            progressBar.style.width = '100%';
            statusElement.textContent = '基础数据文件准备完成';
            progressDetails.innerHTML = `
              <div class="detail-row">
                <span>${data.message || '完成'}</span>
              </div>
              <div class="detail-row">
                <span>总进度: 100%</span>
              </div>
            `;
            break;
            
          case 'extracting_error':
            progressBar.style.backgroundColor = 'var(--danger-color)';
            statusElement.textContent = `解压失败: ${data.error || '未知错误'}`;
            progressDetails.innerHTML = `
              <div class="detail-row">
                <span>${data.message || '解压过程出错'}</span>
              </div>
              <div class="detail-row">
                <span>请尝试手动解压基础数据</span>
              </div>
            `;
            break;
            
          case 'download_complete':
            progressBar.style.width = '100%';
            statusElement.textContent = '下载与基础数据准备完成';
            
            // 更新下载按钮
            const downloadBtn = card.querySelector('.download-btn');
            downloadBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              已下载
            `;
            downloadBtn.disabled = true;
            
            // 关闭WebSocket连接
            socket.close();
            
            // 刷新启动页面的核心列表
            loadCoresList();
            
            // 显示成功消息
            setTimeout(() => {
              alert(`核心已成功下载并准备好基础数据`);
            }, 500);
            break;
            
          case 'download_error':
            statusElement.textContent = `下载失败: ${data.error}`;
            progressBar.style.backgroundColor = 'var(--danger-color)';
            
            // 恢复按钮状态
            const errorBtn = card.querySelector('.download-btn');
            errorBtn.innerHTML = originalText;
            
            // 关闭WebSocket连接
            socket.close();
            break;
        }
      };
      
      socket.onerror = function(error) {
        console.error('WebSocket错误:', error);
        statusElement.textContent = '连接错误，无法获取下载进度';
      };
      
      socket.onclose = function() {
        console.log('WebSocket连接已关闭');
      };
      
      // 连接建立后，开始下载
      socket.onopen = async function() {
        try {
          // 开始下载
          const response = await fetch(`/api/download-core?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}&clientId=${clientId}`);
          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          // 处理数据文件复制信息
          if (data.dataCopied) {
            statusElement.textContent += '，配置文件和资源已自动复制到该目录';
          } else if (data.copyError) {
            statusElement.textContent += `。警告：复制配置文件时发生错误: ${data.copyError}`;
          }
          
        } catch (error) {
          console.error('下载失败', error);
          
          // 恢复按钮状态
          this.innerHTML = originalText;
          progressBar.style.width = '0%';
          
          // 更新状态显示
          statusElement.textContent = `下载失败: ${error.message}`;
          
          // 关闭WebSocket连接
          socket.close();
          
          // 显示错误消息
          alert(`下载失败: ${error.message}`);
        }
      };
      
      return;
    }
    
    // 如果是链接，则直接跳转，不执行下载动画
    if (this.tagName === 'A' && this.hasAttribute('href') && this.getAttribute('href') !== '#' && this.getAttribute('href') !== 'javascript:void(0)') {
      return; // 让浏览器处理链接跳转
    }
    
    e.preventDefault();
    
    // 已经在下载中
    if (this.textContent.includes('下载中')) return;
    
    const card = this.closest('.download-card');
    const progressBar = card.querySelector('.progress');
    
    // 更改按钮文本和禁用
    const originalText = this.innerHTML;
    this.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
      下载中
    `;
    
    // 添加旋转动画
    const spinner = this.querySelector('.spinner');
    spinner.style.animation = 'spin 1s linear infinite';
    
    // 模拟下载进度
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        this.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          已下载
        `;
        this.disabled = true;
      }
      progressBar.style.width = `${progress}%`;
    }, 200);
  }
  
  // 格式化文件大小
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
  
  // 格式化下载速度
  function formatSpeed(kbps) {
    if (kbps < 1024) return kbps + ' KB/s';
    return (kbps / 1024).toFixed(2) + ' MB/s';
  }
  
  // 格式化剩余时间
  function formatTime(ms) {
    if (ms < 1000) return '< 1秒';
    
    let seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}秒`;
    
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    if (minutes < 60) return `${minutes}分${seconds}秒`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}时${remainingMinutes}分`;
  }
}

// 初始化设置页面功能
function initSettingsPage() {
  const settingsForm = document.querySelector('.settings-form');
  const browseButtons = document.querySelectorAll('.btn-browse');
  const resetButton = document.querySelector('.reset-settings-btn');
  const clearDataBtn = document.querySelector('.clear-data-btn');
  const backupSettingsBtn = document.querySelector('.backup-settings-btn');
  const restoreSettingsBtn = document.querySelector('.restore-settings-btn');
  
  if (!settingsForm) return; // 不在设置页面
  
  // 加载保存的设置
  loadSettings();
  
  // 表单提交
  settingsForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 收集所有设置
    const settings = {
      // 界面设置
      appTheme: document.getElementById('app-theme').value,
      enableAnimations: document.getElementById('enable-animations').checked,
      compactMode: document.getElementById('compact-mode').checked,
      
      // 启动设置
      startupTab: document.getElementById('startup-tab').value,
      autoCheckUpdates: document.getElementById('auto-check-updates').checked,
      
      // 游戏路径设置
      gameFolder: document.getElementById('game-folder').value
    };
    
    // 保存设置到本地存储
    localStorage.setItem('launcherSettings', JSON.stringify(settings));
    
    // 应用设置
    applySettings(settings);
    
    // 如果在当前页面有启动游戏按钮，则验证游戏文件
    const launchGameBtn = document.querySelector('.launch-game-btn');
    if (launchGameBtn) {
      // 如果当前在启动页面，重新检查游戏路径和文件
      if (typeof checkGamePathAndFiles === 'function') {
        checkGamePathAndFiles();
      }
    }
    
    // 显示保存成功消息
    showToast('设置已保存并应用', 'success');
  });
  
  // 浏览按钮点击
  browseButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const input = this.parentElement.querySelector('input');
      // 在实际应用中，这里会打开文件选择对话框
      // 由于浏览器限制，我们只能模拟这个功能
      showToast('在实际应用中，这里会打开文件选择对话框');
    });
  });
  
  // 重置按钮点击
  if (resetButton) {
    resetButton.addEventListener('click', function() {
      if (confirm('确定要恢复所有设置到默认值吗？当前的个性化设置将被重置。')) {
        resetSettings();
        showToast('已恢复默认设置', 'success');
      }
    });
  }
  
  // 清除数据按钮点击
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', function() {
      if (confirm('确定要清除所有本地缓存数据吗？这不会影响你的Grasscutter安装。')) {
        // 清除本地存储但保留设置
        const settings = localStorage.getItem('launcherSettings');
        localStorage.clear();
        if (settings) {
          localStorage.setItem('launcherSettings', settings);
        }
        showToast('本地缓存数据已清除');
      }
    });
  }
  
  // 备份设置按钮点击
  if (backupSettingsBtn) {
    backupSettingsBtn.addEventListener('click', function() {
      const settings = localStorage.getItem('launcherSettings');
      if (settings) {
        // 创建下载链接
        const blob = new Blob([settings], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'launcher-settings-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('设置已备份', 'success');
      } else {
        showToast('没有设置可备份');
      }
    });
  }
  
  // 恢复设置按钮点击
  if (restoreSettingsBtn) {
    restoreSettingsBtn.addEventListener('click', function() {
      if (confirm('确定要从备份文件恢复设置吗？当前设置将被覆盖。')) {
        // 创建文件上传输入
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', function() {
          const file = this.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
              try {
                const settings = JSON.parse(e.target.result);
                localStorage.setItem('launcherSettings', JSON.stringify(settings));
                loadSettings();
                showToast('设置已从备份文件恢复', 'success');
              } catch (error) {
                console.error('恢复设置失败', error);
                showToast('恢复设置失败，无效的备份文件', 'error');
              }
            };
            reader.readAsText(file);
          }
          document.body.removeChild(fileInput);
        });
        
        fileInput.click();
      }
    });
  }
}

// 加载保存的设置
function loadSettings() {
  const settingsJson = localStorage.getItem('launcherSettings');
  if (!settingsJson) {
    // 如果没有保存的设置，使用默认值
    const defaultSettings = {
      appTheme: 'default',
      enableAnimations: true,
      compactMode: false,
      startupTab: 'launch',
      autoCheckUpdates: true,
      gameFolder: ''
    };
    // 保存默认设置
    localStorage.setItem('launcherSettings', JSON.stringify(defaultSettings));
    applySettings(defaultSettings);
    return;
  }
  
  try {
    const settings = JSON.parse(settingsJson);
    
    // 处理迁移：确保旧版本设置被迁移到新格式
    // 处理不再需要的设置项
    if ('autoLaunch' in settings || 'closeLauncher' in settings) {
      // 创建新的设置对象，只包含当前版本需要的设置
      const newSettings = {
        appTheme: settings.appTheme || 'default',
        enableAnimations: settings.enableAnimations !== false,
        compactMode: !!settings.compactMode,
        startupTab: settings.startupTab || 'launch',
        autoCheckUpdates: settings.autoCheckUpdates !== false,
        gameFolder: settings.gameFolder || ''
      };
      
      // 保存迁移后的设置
      localStorage.setItem('launcherSettings', JSON.stringify(newSettings));
      console.log('设置已迁移到新版本格式');
      
      // 使用新格式的设置
      applySettings(newSettings);
      return;
    }
    
    // 使用现有设置
    applySettings(settings);
  } catch (error) {
    console.error('加载设置失败', error);
    // 如果设置损坏，重置为默认值
    resetSettings();
  }
}

// 应用设置
function applySettings(settings) {
  // 界面设置
  document.getElementById('app-theme').value = settings.appTheme || 'default';
  document.getElementById('enable-animations').checked = settings.enableAnimations !== false;
  document.getElementById('compact-mode').checked = !!settings.compactMode;
  
  // 启动设置
  document.getElementById('startup-tab').value = settings.startupTab || 'launch';
  document.getElementById('auto-check-updates').checked = settings.autoCheckUpdates !== false;
  
  // 游戏路径设置
  document.getElementById('game-folder').value = settings.gameFolder || '';
  
  // 应用主题
  applyTheme(settings.appTheme);
  
  // 应用动画设置
  document.body.classList.toggle('no-animations', !settings.enableAnimations);
  
  // 应用紧凑模式
  document.body.classList.toggle('compact-mode', !!settings.compactMode);
}

// 重置设置为默认值
function resetSettings() {
  const defaultSettings = {
    appTheme: 'default',
    enableAnimations: true,
    compactMode: false,
    startupTab: 'launch',
    autoCheckUpdates: true,
    gameFolder: ''
  };
  
  localStorage.setItem('launcherSettings', JSON.stringify(defaultSettings));
  applySettings(defaultSettings);
}

// 应用主题
function applyTheme(theme) {
  const root = document.documentElement;
  
  // 移除所有主题类
  root.classList.remove('theme-default', 'theme-dark', 'theme-light', 'theme-green', 'theme-purple');
  
  // 添加新主题类
  root.classList.add(`theme-${theme || 'default'}`);
  
  // 根据主题设置不同的颜色变量
  switch(theme) {
    case 'dark':
      root.style.setProperty('--bg-color', '#121212');
      root.style.setProperty('--card-bg', '#1e1e1e');
      root.style.setProperty('--text-color', '#e0e0e0');
      root.style.setProperty('--primary-color', '#1a73e8');
      root.style.setProperty('--secondary-color', '#5f6368');
      break;
    case 'light':
      root.style.setProperty('--bg-color', '#f8f9fa');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--text-color', '#202124');
      root.style.setProperty('--primary-color', '#1a73e8');
      root.style.setProperty('--secondary-color', '#5f6368');
      break;
    case 'green':
      root.style.setProperty('--bg-color', '#f1f8e9');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--text-color', '#33691e');
      root.style.setProperty('--primary-color', '#558b2f');
      root.style.setProperty('--secondary-color', '#7cb342');
      break;
    case 'purple':
      root.style.setProperty('--bg-color', '#f3e5f5');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--text-color', '#4a148c');
      root.style.setProperty('--primary-color', '#6a1b9a');
      root.style.setProperty('--secondary-color', '#8e24aa');
      break;
    default:
      // 默认蓝色主题
      root.style.setProperty('--bg-color', '#f0f7ff');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--text-color', '#1e2851');
      root.style.setProperty('--primary-color', '#1d62ee');
      root.style.setProperty('--secondary-color', '#51abf9');
      break;
  }
}

// 显示提示消息
function showToast(message, type = 'default') {
  // 检查是否已有toast元素
  let toast = document.getElementById('toast-message');
  
  if (!toast) {
    // 创建toast元素
    toast = document.createElement('div');
    toast.id = 'toast-message';
    document.body.appendChild(toast);
    
    // 添加基本样式
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '6px';
    toast.style.zIndex = '1000';
    toast.style.transition = 'all 0.3s ease-in-out';
    toast.style.fontWeight = '500';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
  }
  
  // 根据类型设置不同的样式
  if (type === 'success') {
    toast.style.backgroundColor = 'rgba(46, 213, 115, 0.9)';
    toast.style.color = 'white';
    toast.style.boxShadow = '0 4px 15px rgba(46, 213, 115, 0.3)';
    
    // 添加成功图标
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      ${message}
    `;
  } else if (type === 'error') {
    toast.style.backgroundColor = 'rgba(255, 71, 87, 0.9)';
    toast.style.color = 'white';
    toast.style.boxShadow = '0 4px 15px rgba(255, 71, 87, 0.3)';
    
    // 添加错误图标
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      ${message}
    `;
  } else {
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    toast.style.color = 'white';
    toast.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    toast.textContent = message;
  }
  
  // 显示toast
  toast.style.opacity = '1';
  toast.style.transform = 'translate(-50%, -10px)';
  
  // 添加轻微的弹跳效果
  toast.style.animation = 'toast-bounce 0.3s ease';
  
  // 3秒后隐藏
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, 20px)';
  }, 3000);
  
  // 添加动画关键帧
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes toast-bounce {
        0% { transform: translate(-50%, 20px); }
        50% { transform: translate(-50%, -15px); }
        100% { transform: translate(-50%, -10px); }
      }
    `;
    document.head.appendChild(style);
  }
}

// 初始化其他页面功能
function initOthersPage() {
  // 不需要特殊处理逻辑，页面只有静态内容
}

// 定义关键帧动画
if (!document.getElementById('animations')) {
  const style = document.createElement('style');
  style.id = 'animations';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// 加载已安装的核心列表
async function loadCoresList() {
  const launchSection = document.querySelector('.launch-container');
  if (!launchSection) return;
  
  try {
    const response = await fetch('/api/cores');
    const cores = await response.json();
    
    // 找到启动容器
    const coreSelectionContainer = document.getElementById('core-selection');
    if (!coreSelectionContainer) {
      // 如果容器不存在，创建一个
      createCoreSelectionUI(launchSection, cores);
    } else {
      // 更新现有容器
      updateCoreSelectionUI(coreSelectionContainer, cores);
    }
    
    // 确保在页面加载后立即检查所选核心的资源
    setTimeout(() => {
      const selectedCore = document.querySelector('input[name="selected-core"]:checked');
      if (selectedCore) {
        checkCoreResources(selectedCore.value);
      }
    }, 300);
    
  } catch (error) {
    console.error('获取核心列表失败', error);
    // 创建错误提示
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = '获取核心列表失败: ' + error.message;
    
    // 如果启动按钮存在，禁用它
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
      startBtn.disabled = true;
    }
  }
}

// 创建核心选择UI
function createCoreSelectionUI(container, cores) {
  const coreSelectionCard = document.createElement('div');
  coreSelectionCard.className = 'card';
  coreSelectionCard.id = 'core-selection';
  
  const cardHeader = document.createElement('h3');
  cardHeader.textContent = '可用核心';
  coreSelectionCard.appendChild(cardHeader);
  
  // 检查是否有可用核心
  if (cores.length === 0) {
    // 没有可用核心，显示下载提示
    const noConfigsMsg = document.createElement('p');
    noConfigsMsg.textContent = '没有找到Grasscutter核心。请先在下载页面下载核心。';
    noConfigsMsg.className = 'no-configs-message';
    
    const downloadBtn = document.createElement('a');
    downloadBtn.href = '/download';
    downloadBtn.className = 'btn btn-primary';
    downloadBtn.textContent = '前往下载页面';
    
    coreSelectionCard.appendChild(noConfigsMsg);
    coreSelectionCard.appendChild(downloadBtn);
    
    // 禁用启动按钮
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
      startBtn.disabled = true;
    }
  } else {
    // 有可用核心，创建选择列表
    const coresList = document.createElement('div');
    coresList.className = 'cores-list';
    
    cores.forEach((core, index) => {
      const coreItem = document.createElement('div');
      coreItem.className = 'core-item';
      
      const radioButton = document.createElement('input');
      radioButton.type = 'radio';
      radioButton.name = 'selected-core';
      radioButton.id = `core-${index}`;
      radioButton.value = core.path;
      radioButton.checked = index === 0; // 默认选中第一个
      
      const label = document.createElement('label');
      label.htmlFor = `core-${index}`;
      label.textContent = `${core.name} (${core.jarFile})`;
      
      coreItem.appendChild(radioButton);
      coreItem.appendChild(label);
      coresList.appendChild(coreItem);
      
      // 添加核心选择事件监听
      radioButton.addEventListener('change', function() {
        if (this.checked) {
          checkCoreResources(this.value);
        }
      });
    });
    
    coreSelectionCard.appendChild(coresList);
    
    // 添加警告消息容器
    const warningContainer = document.createElement('div');
    warningContainer.id = 'core-warning-container';
    warningContainer.style.marginTop = '15px';
    coreSelectionCard.appendChild(warningContainer);
    
    // 启用启动按钮
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
      startBtn.disabled = false;
    }
    
    // 检查默认选中的核心
    const defaultCore = document.querySelector('input[name="selected-core"]:checked');
    if (defaultCore) {
      checkCoreResources(defaultCore.value);
    }
  }
  
  // 将卡片插入到控制面板之前
  const controlPanel = container.querySelector('.control-panel');
  if (controlPanel) {
    container.insertBefore(coreSelectionCard, controlPanel);
  } else {
    container.appendChild(coreSelectionCard);
  }
}

// 更新核心选择UI
function updateCoreSelectionUI(container, cores) {
  // 清空当前内容
  container.innerHTML = '';
  
  const cardHeader = document.createElement('h3');
  cardHeader.textContent = '可用核心';
  container.appendChild(cardHeader);
  
  // 检查是否有可用核心
  if (cores.length === 0) {
    // 没有可用核心，显示下载提示
    const noConfigsMsg = document.createElement('p');
    noConfigsMsg.textContent = '没有找到Grasscutter核心。请先在下载页面下载核心。';
    noConfigsMsg.className = 'no-configs-message';
    
    const downloadBtn = document.createElement('a');
    downloadBtn.href = '/download';
    downloadBtn.className = 'btn btn-primary';
    downloadBtn.textContent = '前往下载页面';
    
    container.appendChild(noConfigsMsg);
    container.appendChild(downloadBtn);
    
    // 禁用启动按钮
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
      startBtn.disabled = true;
    }
  } else {
    // 有可用核心，创建选择列表
    const coresList = document.createElement('div');
    coresList.className = 'cores-list';
    
    cores.forEach((core, index) => {
      const coreItem = document.createElement('div');
      coreItem.className = 'core-item';
      
      const radioButton = document.createElement('input');
      radioButton.type = 'radio';
      radioButton.name = 'selected-core';
      radioButton.id = `core-${index}`;
      radioButton.value = core.path;
      radioButton.checked = index === 0; // 默认选中第一个
      
      const label = document.createElement('label');
      label.htmlFor = `core-${index}`;
      label.textContent = `${core.name} (${core.jarFile})`;
      
      coreItem.appendChild(radioButton);
      coreItem.appendChild(label);
      coresList.appendChild(coreItem);
      
      // 添加核心选择事件监听
      radioButton.addEventListener('change', function() {
        if (this.checked) {
          checkCoreResources(this.value);
        }
      });
    });
    
    container.appendChild(coresList);
    
    // 添加警告消息容器
    const warningContainer = document.createElement('div');
    warningContainer.id = 'core-warning-container';
    warningContainer.style.marginTop = '15px';
    container.appendChild(warningContainer);
    
    // 启用启动按钮
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
      startBtn.disabled = false;
    }
    
    // 检查默认选中的核心
    const defaultCore = document.querySelector('input[name="selected-core"]:checked');
    if (defaultCore) {
      checkCoreResources(defaultCore.value);
    }
  }
}

// 检查核心资源
async function checkCoreResources(corePath) {
  const warningContainer = document.getElementById('core-warning-container');
  if (!warningContainer) return;
  
  warningContainer.innerHTML = '';
  const startBtn = document.querySelector('.start-btn');
  
  try {
    const response = await fetch(`/api/check-core-resources?corePath=${encodeURIComponent(corePath)}`);
    const data = await response.json();
    
    let hasResourceWarning = false;
    let hasWarnings = false;
    
    // 检查资源文件夹是否存在或为空
    if (!data.serverResourcesExist || !data.resourcesFolderExist || data.resourcesFolderEmpty) {
      hasResourceWarning = true;
      hasWarnings = true;
      // 创建资源缺失警告
      const warningCard = document.createElement('div');
      warningCard.className = 'warning-card';
      
      // 根据不同情况显示不同信息
      let warningMessage = '';
      if (!data.serverResourcesExist) {
        warningMessage = '当前核心缺少服务器资源文件夹';
      } else if (!data.resourcesFolderExist) {
        warningMessage = '当前核心缺少资源文件夹（服务器资源/资源）';
      } else if (data.resourcesFolderEmpty) {
        warningMessage = '当前核心的资源文件夹为空';
      }
      
      warningCard.innerHTML = `
        <div class="warning-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="warning-content">
          <h4>资源文件缺失</h4>
          <p>${warningMessage}，无法启动服务器。请先下载资源文件。</p>
          <a href="/download" class="btn btn-warning btn-sm">前往下载资源</a>
        </div>
      `;
      warningContainer.appendChild(warningCard);
      
      // 禁用启动按钮
      if (startBtn) startBtn.disabled = true;
    }
    
    // 检查数据库文件夹
    if (!data.databaseExist || data.databaseEmpty) {
      hasWarnings = true;
      const warningCard = document.createElement('div');
      warningCard.className = 'warning-card';
      
      let warningMessage = '';
      if (!data.databaseExist) {
        warningMessage = '当前核心缺少数据库文件夹';
      } else if (data.databaseEmpty) {
        warningMessage = '当前核心的数据库文件夹为空';
      }
      
      warningCard.innerHTML = `
        <div class="warning-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="warning-content">
          <h4>数据库文件缺失</h4>
          <p>${warningMessage}，服务器将无法存储数据。请先下载数据库文件。</p>
          <a href="/download" class="btn btn-warning btn-sm">前往下载资源</a>
        </div>
      `;
      warningContainer.appendChild(warningCard);
    }
    
    // 检查运行环境文件夹
    if (!data.runtimeEnvExist || data.runtimeEnvEmpty) {
      hasWarnings = true;
      const warningCard = document.createElement('div');
      warningCard.className = 'warning-card';
      
      let warningMessage = '';
      if (!data.runtimeEnvExist) {
        warningMessage = '当前核心缺少运行环境文件夹';
      } else if (data.runtimeEnvEmpty) {
        warningMessage = '当前核心的运行环境文件夹为空或缺少必要的Java环境';
      }
      
      warningCard.innerHTML = `
        <div class="warning-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="warning-content">
          <h4>运行环境缺失</h4>
          <p>${warningMessage}，服务器将无法运行。请先下载Java运行环境。</p>
          <a href="/download" class="btn btn-warning btn-sm">前往下载资源</a>
        </div>
      `;
      warningContainer.appendChild(warningCard);
      
      // 禁用启动按钮 - 没有Java环境无法启动
      if (startBtn) startBtn.disabled = true;
    }
    
    // 检查指令和代理工具文件夹
    if (!data.proxyToolsExist || data.proxyToolsEmpty) {
      hasWarnings = true;
      const warningCard = document.createElement('div');
      warningCard.className = 'warning-card';
      
      let warningMessage = '';
      if (!data.proxyToolsExist) {
        warningMessage = '当前核心缺少指令和代理工具文件夹';
      } else if (data.proxyToolsEmpty) {
        warningMessage = '当前核心的指令和代理工具文件夹为空';
      }
      
      warningCard.innerHTML = `
        <div class="warning-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="warning-content">
          <h4>代理工具缺失</h4>
          <p>${warningMessage}，可能无法进行游戏连接。请先下载代理工具。</p>
          <a href="/download" class="btn btn-warning btn-sm">前往下载资源</a>
        </div>
      `;
      warningContainer.appendChild(warningCard);
    }
    
    // 检查ActivityConfig.json是否存在
    if (!data.activityConfigExist) {
      hasWarnings = true;
      const warningCard = document.createElement('div');
      warningCard.className = 'warning-card';
      
      warningCard.innerHTML = `
        <div class="warning-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="warning-content">
          <h4>活动配置缺失</h4>
          <p>当前核心缺少ActivityConfig.json文件，游戏中的活动可能无法正常显示。</p>
          <a href="/download" class="btn btn-warning btn-sm">前往下载资源</a>
        </div>
      `;
      warningContainer.appendChild(warningCard);
    }
    
    // 检查Shop.json是否存在
    if (!data.shopJsonExist) {
      hasWarnings = true;
      const warningCard = document.createElement('div');
      warningCard.className = 'warning-card';
      
      warningCard.innerHTML = `
        <div class="warning-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="warning-content">
          <h4>商店配置缺失</h4>
          <p>当前核心缺少Shop.json文件，游戏中的商店功能可能无法正常使用。</p>
          <a href="/download" class="btn btn-warning btn-sm">前往下载资源</a>
        </div>
      `;
      warningContainer.appendChild(warningCard);
    }

    if (!data.bannersExist) {
      hasWarnings = true;
      // 创建卡池配置缺失警告
      const warningCard = document.createElement('div');
      warningCard.className = 'warning-card';
      warningCard.innerHTML = `
        <div class="warning-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="warning-content">
          <h4>卡池配置缺失</h4>
          <p>当前核心未配置卡池(Banners.json)，可能会影响游戏体验。</p>
          <a href="https://github.com/Zhaokugua/Grasscutter_Banners" target="_blank" class="btn btn-warning btn-sm">下载卡池配置</a>
        </div>
      `;
      warningContainer.appendChild(warningCard);
    }
    
    // 检查config.json是否存在
    if (!data.configExist) {
      hasWarnings = true;
      // 创建config.json配置缺失警告
      const warningCard = document.createElement('div');
      warningCard.className = 'warning-card';
      warningCard.innerHTML = `
        <div class="warning-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="warning-content">
          <h4>配置文件缺失</h4>
          <p>当前核心缺少配置文件(config.json)，服务器可能无法正常启动。</p>
          <a href="https://github.com/Grasscutters/Grasscutter/blob/development/src/main/resources/defaults/config.json" target="_blank" class="btn btn-warning btn-sm">下载配置文件</a>
        </div>
      `;
      warningContainer.appendChild(warningCard);
    }
    
    // 如果没有任何警告，添加一个成功提示
    if (!hasWarnings) {
      const successCard = document.createElement('div');
      successCard.className = 'success-card';
      successCard.innerHTML = `
        <div class="success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <div class="success-content">
          <h4>核心完整</h4>
          <p>所有必要的文件和目录均已检测到，核心可以正常启动。</p>
        </div>
      `;
      warningContainer.appendChild(successCard);
    }
    
    // 启用启动按钮（如果资源存在且不为空）
    if (startBtn && !hasResourceWarning && data.runtimeEnvExist && !data.runtimeEnvEmpty) {
      startBtn.disabled = false;
    }
    
  } catch (error) {
    console.error('检查核心资源失败', error);
    const warningCard = document.createElement('div');
    warningCard.className = 'warning-card';
    warningCard.innerHTML = `
      <div class="warning-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </div>
      <div class="warning-content">
        <h4>检查失败</h4>
        <p>检查核心资源时发生错误: ${error.message}</p>
      </div>
    `;
    warningContainer.appendChild(warningCard);
  }
} 