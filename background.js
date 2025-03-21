// 当安装或更新扩展时初始化
chrome.runtime.onInstalled.addListener(() => {
  // 初始化存储
  chrome.storage.local.get(['workspaces'], (result) => {
    if (!result.workspaces) {
      chrome.storage.local.set({ 
        workspaces: [],
        activeWorkspace: null,
        workspaceWindows: {} // 新增：工作区ID到窗口ID的映射
      });
    }
  });

  // 输出调试信息
  console.log('Chrome Workspace 扩展已安装/更新');
});

// 监听标签页更新事件，保存当前工作区状态
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url !== 'chrome://newtab/') {
    updateWorkspaceState();
  }
});

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener(() => {
  updateWorkspaceState();
});

// 监听窗口关闭事件
chrome.windows.onRemoved.addListener((windowId) => {
  // 当窗口关闭时，清除对应的工作区窗口映射
  chrome.storage.local.get(['workspaceWindows'], (result) => {
    const workspaceWindows = result.workspaceWindows || {};
    
    // 找到对应这个窗口ID的工作区ID
    const workspaceId = Object.keys(workspaceWindows).find(
      wsId => workspaceWindows[wsId] === windowId
    );
    
    if (workspaceId) {
      // 删除该映射
      delete workspaceWindows[workspaceId];
      chrome.storage.local.set({ workspaceWindows });
      console.log(`窗口 ${windowId} 已关闭，移除工作区 ${workspaceId} 的映射`);
    }
  });
});

// 更新当前工作区状态
function updateWorkspaceState() {
  chrome.storage.local.get(['activeWorkspace', 'workspaces'], (result) => {
    if (result.activeWorkspace) {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const workspaceTabs = tabs.map(tab => ({
          url: tab.url,
          title: tab.title,
          favicon: tab.favIconUrl
        }));

        const updatedWorkspaces = result.workspaces.map(workspace => {
          if (workspace.id === result.activeWorkspace) {
            return { ...workspace, tabs: workspaceTabs, lastModified: Date.now() };
          }
          return workspace;
        });

        chrome.storage.local.set({ workspaces: updatedWorkspaces });
      });
    }
  });
}

// 创建新工作区窗口
function createWorkspaceWindow(workspaceId, urls = []) {
  chrome.windows.create({ url: urls.length > 0 ? urls : ['chrome://newtab'] }, (window) => {
    // 保存工作区ID和窗口ID的映射关系
    chrome.storage.local.get(['workspaceWindows'], (result) => {
      const workspaceWindows = result.workspaceWindows || {};
      workspaceWindows[workspaceId] = window.id;
      
      chrome.storage.local.set({ 
        workspaceWindows: workspaceWindows,
        activeWorkspace: workspaceId 
      }, () => {
        console.log(`创建了工作区 ${workspaceId} 的新窗口：${window.id}`);
      });
      
      // 设置窗口标题和颜色
      chrome.storage.local.get(['workspaces'], (wsResult) => {
        const workspace = wsResult.workspaces.find(w => w.id === workspaceId);
        if (workspace) {
          // 为窗口中的所有标签页应用颜色
          applyWorkspaceColorToWindow(window.id, workspace.color);
          
          // 为第一个标签页添加工作区信息到标题
          chrome.tabs.query({ windowId: window.id }, (tabs) => {
            if (tabs.length > 0) {
              chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: (workspaceName) => {
                  document.title = `[${workspaceName}] ${document.title}`;
                },
                args: [workspace.name]
              }).catch(err => console.log('标题设置失败:', err));
            }
          });
        }
      });
    });
  });
}

// 应用工作区颜色到窗口
function applyWorkspaceColorToWindow(windowId, color) {
  // 由于Chrome扩展无法直接改变窗口颜色，我们可以使用CSS注入到所有标签页
  chrome.tabs.query({ windowId: windowId }, (tabs) => {
    tabs.forEach(tab => {
      // 跳过Chrome内置页面，因为无法注入脚本
      if (!tab.url.startsWith('chrome://')) {
        chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          css: `
            /* 添加在顶部的一个彩色标记条 */
            body::before {
              content: '';
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background-color: ${color};
              z-index: 2147483647;
            }
          `
        }).catch(err => console.log('CSS注入失败:', err));
      }
    });
  });
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request.action);
  
  if (request.action === 'createWorkspace') {
    const newWorkspace = {
      id: Date.now().toString(),
      name: request.name,
      tabs: [],
      createdAt: Date.now(),
      lastModified: Date.now(),
      color: request.color || '#0078d4' // 工作区颜色
    };

    chrome.storage.local.get(['workspaces'], (result) => {
      const updatedWorkspaces = [...result.workspaces, newWorkspace];
      chrome.storage.local.set({ 
        workspaces: updatedWorkspaces,
        activeWorkspace: newWorkspace.id 
      }, () => {
        createWorkspaceWindow(newWorkspace.id);
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'openWorkspace') {
    console.log('尝试打开工作区:', request.workspaceId);
    
    chrome.storage.local.get(['workspaces', 'workspaceWindows'], (result) => {
      const workspace = result.workspaces.find(w => w.id === request.workspaceId);
      const workspaceWindows = result.workspaceWindows || {};
      
      if (!workspace) {
        sendResponse({ success: false, message: '未找到工作区' });
        return;
      }
      
      console.log('找到工作区:', workspace.name);
      console.log('当前工作区窗口映射:', workspaceWindows);
      
      // 检查该工作区是否已有关联窗口
      const existingWindowId = workspaceWindows[request.workspaceId];
      
      if (existingWindowId) {
        console.log('工作区有关联窗口:', existingWindowId);
        
        // 如果窗口已存在，检查窗口是否还在
        chrome.windows.get(existingWindowId, {}, (window) => {
          if (chrome.runtime.lastError) {
            console.log('窗口不存在，创建新窗口:', chrome.runtime.lastError);
            // 窗口不存在，创建新窗口
            const urls = workspace.tabs.map(tab => tab.url);
            createWorkspaceWindow(workspace.id, urls);
            sendResponse({ success: true });
          } else {
            console.log('窗口存在，将其置于最前');
            // 窗口存在，将其置于最前
            chrome.windows.update(existingWindowId, { focused: true }, () => {
              chrome.storage.local.set({ activeWorkspace: workspace.id });
              sendResponse({ success: true });
            });
          }
        });
      } else {
        console.log('工作区没有关联窗口，创建新窗口');
        // 窗口不存在，创建新窗口
        const urls = workspace.tabs.map(tab => tab.url);
        createWorkspaceWindow(workspace.id, urls);
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (request.action === 'deleteWorkspace') {
    chrome.storage.local.get(['workspaces', 'activeWorkspace', 'workspaceWindows'], (result) => {
      const workspaceWindows = result.workspaceWindows || {};
      const windowId = workspaceWindows[request.workspaceId];
      
      // 如果该工作区有对应的窗口，关闭它
      if (windowId) {
        chrome.windows.remove(windowId, () => {
          if (chrome.runtime.lastError) {
            console.log('关闭窗口失败:', chrome.runtime.lastError);
          }
        });
        
        // 清除映射
        delete workspaceWindows[request.workspaceId];
      }
      
      const updatedWorkspaces = result.workspaces.filter(w => w.id !== request.workspaceId);
      chrome.storage.local.set({ 
        workspaces: updatedWorkspaces,
        workspaceWindows: workspaceWindows,
        activeWorkspace: result.activeWorkspace === request.workspaceId ? null : result.activeWorkspace
      }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'updateWorkspace') {
    console.log('更新工作区:', request.workspaceId, '名称:', request.name, '颜色:', request.color);
    
    chrome.storage.local.get(['workspaces', 'workspaceWindows'], (result) => {
      const updatedWorkspaces = result.workspaces.map(workspace => {
        if (workspace.id === request.workspaceId) {
          console.log('找到要更新的工作区:', workspace.name, '→', request.name);
          return { 
            ...workspace, 
            name: request.name || workspace.name,
            color: request.color || workspace.color,
            lastModified: Date.now()
          };
        }
        return workspace;
      });
      
      chrome.storage.local.set({ workspaces: updatedWorkspaces }, () => {
        console.log('工作区已更新');
        
        // 如果工作区有活动窗口，更新其颜色
        const workspaceWindows = result.workspaceWindows || {};
        const windowId = workspaceWindows[request.workspaceId];
        
        if (windowId && request.color) {
          console.log('更新窗口颜色:', windowId, request.color);
          // 更新窗口颜色
          applyWorkspaceColorToWindow(windowId, request.color);
        }
        
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'getCurrentWorkspace') {
    chrome.storage.local.get(['activeWorkspace', 'workspaces'], (result) => {
      if (result.activeWorkspace) {
        const workspace = result.workspaces.find(w => w.id === result.activeWorkspace);
        sendResponse({ workspace });
      } else {
        sendResponse({ workspace: null });
      }
    });
    return true;
  }
}); 