# Chrome Workspace 扩展

这个Chrome扩展为Chrome浏览器提供类似Edge浏览器的Workspace（工作区）功能。

## 功能

- 创建命名的工作区，用于组织和保存标签页
- 自动保存工作区中的标签页状态
- 可以随时恢复之前的工作区状态
- 可以创建多个工作区，并在它们之间切换
- 工作区状态持久保存，即使关闭浏览器也不会丢失

## 安装步骤

1. 下载或克隆此仓库到本地
2. 打开Chrome浏览器，在地址栏输入 `chrome://extensions/`
3. 在右上角启用"开发者模式"
4. 点击"加载已解压的扩展程序"按钮
5. 选择此仓库的文件夹位置

## 使用方法

1. 安装扩展后，点击Chrome工具栏上的扩展图标打开工作区管理界面
2. 输入名称创建新工作区
3. 在工作区中浏览网页，所有标签页都会自动保存
4. 点击工作区列表中的工作区可以切换到该工作区
5. 可以通过点击删除按钮删除不需要的工作区

## 权限说明

此扩展需要以下权限：

- `tabs`: 用于读取和管理标签页
- `storage`: 用于保存工作区数据
- `unlimitedStorage`: 用于存储大量工作区数据

## 技术栈

- HTML/CSS/JavaScript
- Chrome扩展API

## 开发者

如果您想为此项目贡献代码，可以通过以下方式参与：

1. Fork 此仓库
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request 