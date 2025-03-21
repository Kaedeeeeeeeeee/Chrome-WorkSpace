document.addEventListener('DOMContentLoaded', () => {
  const workspacesContainer = document.getElementById('workspaces-container');
  const noWorkspacesMessage = document.getElementById('no-workspaces');
  const workspaceNameInput = document.getElementById('workspace-name');
  const createWorkspaceBtn = document.getElementById('create-workspace-btn');
  const activeWorkspaceName = document.getElementById('active-workspace-name');
  const colorOptions = document.querySelectorAll('.color-options .color-option');
  const editColorOptions = document.querySelectorAll('.edit-color-options .color-option');
  
  // 编辑模态框元素
  const editModal = document.getElementById('edit-modal');
  const editNameInput = document.getElementById('edit-name');
  const saveEditBtn = document.getElementById('save-edit-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  
  let currentEditingWorkspace = null;
  let selectedColor = '#0078d4'; // 默认颜色
  let selectedEditColor = '#0078d4'; // 编辑时默认颜色

  console.log('Popup已加载');
  
  // 初始化颜色选择器
  initColorOptions();
  
  // 加载工作区列表和当前工作区信息
  loadWorkspaces();
  loadCurrentWorkspace();

  // 创建工作区按钮点击事件
  createWorkspaceBtn.addEventListener('click', () => {
    const workspaceName = workspaceNameInput.value.trim();
    if (workspaceName) {
      console.log('创建工作区:', workspaceName, selectedColor);
      createWorkspace(workspaceName, selectedColor);
      workspaceNameInput.value = '';
    }
  });

  // 按回车创建工作区
  workspaceNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      createWorkspaceBtn.click();
    }
  });
  
  // 初始化颜色选择器
  function initColorOptions() {
    console.log('初始化颜色选择器');
    // 默认选中第一个颜色
    colorOptions[0].classList.add('selected');
    
    // 添加颜色选择事件
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        // 移除之前的选中状态
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        // 添加新的选中状态
        option.classList.add('selected');
        // 保存选中的颜色
        selectedColor = option.dataset.color;
        console.log('选择了颜色:', selectedColor);
      });
    });
    
    // 编辑模态框中的颜色选择
    editColorOptions.forEach(option => {
      option.addEventListener('click', () => {
        // 移除之前的选中状态
        editColorOptions.forEach(opt => opt.classList.remove('selected'));
        // 添加新的选中状态
        option.classList.add('selected');
        // 保存选中的颜色
        selectedEditColor = option.dataset.color;
        console.log('编辑模式选择了颜色:', selectedEditColor);
      });
    });
  }
  
  // 保存编辑按钮点击事件
  saveEditBtn.addEventListener('click', () => {
    if (currentEditingWorkspace) {
      const name = editNameInput.value.trim();
      
      if (name) {
        console.log('保存工作区编辑:', currentEditingWorkspace, name, selectedEditColor);
        updateWorkspace(currentEditingWorkspace, name, selectedEditColor);
        closeEditModal();
      }
    }
  });
  
  // 取消编辑按钮点击事件
  cancelEditBtn.addEventListener('click', () => {
    closeEditModal();
  });

  // 加载工作区列表
  function loadWorkspaces() {
    console.log('加载工作区列表');
    chrome.storage.local.get(['workspaces', 'activeWorkspace'], (result) => {
      const { workspaces = [], activeWorkspace } = result;
      console.log('获取到工作区:', workspaces.length, '个');
      
      if (workspaces.length === 0) {
        noWorkspacesMessage.style.display = 'block';
      } else {
        noWorkspacesMessage.style.display = 'none';
        renderWorkspaces(workspaces, activeWorkspace);
      }
    });
  }
  
  // 加载当前活动工作区信息
  function loadCurrentWorkspace() {
    console.log('加载当前工作区信息');
    chrome.runtime.sendMessage(
      { action: 'getCurrentWorkspace' },
      (response) => {
        if (response && response.workspace) {
          console.log('当前工作区:', response.workspace.name);
          activeWorkspaceName.textContent = response.workspace.name;
          activeWorkspaceName.style.color = response.workspace.color || '#0078d4';
        } else {
          console.log('没有当前工作区');
          activeWorkspaceName.textContent = '未选择工作区';
          activeWorkspaceName.style.color = '#666';
        }
      }
    );
  }

  // 渲染工作区列表
  function renderWorkspaces(workspaces, activeWorkspace) {
    console.log('渲染工作区列表, 活动工作区:', activeWorkspace);
    // 清空已有内容
    while (workspacesContainer.firstChild) {
      if (workspacesContainer.firstChild !== noWorkspacesMessage) {
        workspacesContainer.removeChild(workspacesContainer.firstChild);
      } else {
        break;
      }
    }

    // 按最后修改时间排序
    workspaces.sort((a, b) => b.lastModified - a.lastModified);

    // 创建工作区元素
    workspaces.forEach(workspace => {
      const workspaceEl = createWorkspaceElement(workspace, activeWorkspace);
      workspacesContainer.appendChild(workspaceEl);
    });
  }

  // 创建单个工作区元素
  function createWorkspaceElement(workspace, activeWorkspace) {
    const workspaceEl = document.createElement('div');
    workspaceEl.className = 'workspace-item';
    if (workspace.id === activeWorkspace) {
      workspaceEl.classList.add('active');
    }

    // 工作区图标（使用工作区名称首字母）
    const firstLetter = workspace.name.charAt(0).toUpperCase();
    const iconColor = workspace.color || '#0078d4';
    
    workspaceEl.innerHTML = `
      <div class="workspace-icon" style="background-color: ${iconColor};">${firstLetter}</div>
      <div class="workspace-info">
        <div class="workspace-name">${workspace.name}</div>
        <div class="workspace-tabs">${workspace.tabs.length} 个标签页</div>
      </div>
      <div class="workspace-actions">
        <button class="open-btn" title="打开工作区">打开</button>
        <button class="edit-btn" title="编辑工作区">编辑</button>
        <button class="delete-btn" title="删除工作区">删除</button>
      </div>
    `;

    // 点击工作区打开
    workspaceEl.querySelector('.open-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('点击打开工作区:', workspace.id);
      openWorkspace(workspace.id);
    });

    // 点击整个区域也能打开
    workspaceEl.addEventListener('click', () => {
      console.log('点击工作区区域, 打开工作区:', workspace.id);
      openWorkspace(workspace.id);
    });
    
    // 编辑工作区
    workspaceEl.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('点击编辑工作区:', workspace.id, workspace.name);
      openEditModal(workspace);
    });

    // 删除工作区
    workspaceEl.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`确定要删除工作区 "${workspace.name}" 吗?`)) {
        console.log('删除工作区:', workspace.id);
        deleteWorkspace(workspace.id);
      }
    });

    return workspaceEl;
  }

  // 创建新工作区
  function createWorkspace(name, color) {
    console.log('发送创建工作区请求:', name, color);
    chrome.runtime.sendMessage(
      { action: 'createWorkspace', name, color },
      (response) => {
        if (response && response.success) {
          console.log('工作区创建成功');
          loadWorkspaces();
          loadCurrentWorkspace();
          window.close(); // 关闭弹出窗口
        } else {
          console.error('工作区创建失败');
        }
      }
    );
  }

  // 打开工作区
  function openWorkspace(workspaceId) {
    console.log('发送打开工作区请求:', workspaceId);
    chrome.runtime.sendMessage(
      { action: 'openWorkspace', workspaceId },
      (response) => {
        if (response && response.success) {
          console.log('工作区打开成功');
          loadCurrentWorkspace();
          window.close(); // 关闭弹出窗口
        } else {
          console.error('工作区打开失败:', response ? response.message : '未知错误');
        }
      }
    );
  }

  // 删除工作区
  function deleteWorkspace(workspaceId) {
    console.log('发送删除工作区请求:', workspaceId);
    chrome.runtime.sendMessage(
      { action: 'deleteWorkspace', workspaceId },
      (response) => {
        if (response && response.success) {
          console.log('工作区删除成功');
          loadWorkspaces();
          loadCurrentWorkspace();
        } else {
          console.error('工作区删除失败');
        }
      }
    );
  }
  
  // 更新工作区
  function updateWorkspace(workspaceId, name, color) {
    console.log('发送更新工作区请求:', workspaceId, name, color);
    chrome.runtime.sendMessage(
      { action: 'updateWorkspace', workspaceId, name, color },
      (response) => {
        if (response && response.success) {
          console.log('工作区更新成功');
          loadWorkspaces();
          loadCurrentWorkspace();
        } else {
          console.error('工作区更新失败');
        }
      }
    );
  }
  
  // 打开编辑模态框
  function openEditModal(workspace) {
    console.log('打开编辑模态框:', workspace.id, workspace.name, workspace.color);
    currentEditingWorkspace = workspace.id;
    editNameInput.value = workspace.name;
    selectedEditColor = workspace.color || '#0078d4';
    
    // 更新编辑框中的颜色选择状态
    editColorOptions.forEach(option => {
      option.classList.remove('selected');
      if (option.dataset.color === selectedEditColor) {
        option.classList.add('selected');
      }
    });
    
    editModal.classList.add('show');
  }
  
  // 关闭编辑模态框
  function closeEditModal() {
    console.log('关闭编辑模态框');
    currentEditingWorkspace = null;
    editModal.classList.remove('show');
  }
}); 