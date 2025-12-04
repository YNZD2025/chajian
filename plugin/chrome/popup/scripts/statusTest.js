/**
 * 状态提示系统测试脚本
 * 在浏览器控制台运行此脚本来测试不同的状态效果
 */

// 测试函数1：模拟完整的填充流程
function testFullProcess() {
  console.log('开始测试完整流程...');

  // 1. 启动
  setTimeout(() => {
    window.updateStatusPopup('一念职达！为您职达岗位！', 'processing');
  }, 500);

  // 2. 扫描阶段
  setTimeout(() => {
    window.updateStatusPopup('正在扫描网站...', 'processing');
  }, 2000);

  // 3. 标记阶段
  setTimeout(() => {
    window.updateStatusPopup('正在标记简历字段...', 'processing');
  }, 3500);

  // 4. 理解简历
  setTimeout(() => {
    window.updateStatusPopup('正在理解简历...', 'processing');
  }, 5000);

  // 5. 思考策略
  setTimeout(() => {
    window.updateStatusPopup('开始思考网站填写策略...', 'processing');
  }, 6500);

  // 6. 填充阶段
  setTimeout(() => {
    window.updateStatusPopup('尝试为你填写简历...', 'processing');
  }, 8000);

  // 7. 完成
  setTimeout(() => {
    window.updateStatusPopup('填写完成！剩下的空就交给你咯~', 'success');
  }, 9500);
}

// 测试函数2：测试错误状态
function testError() {
  console.log('测试错误状态...');
  window.updateStatusPopup('填写出错：网络连接失败，请刷新重试', 'error');
}

// 测试函数3：测试处理中状态
function testProcessing() {
  console.log('测试处理中状态...');
  window.updateStatusPopup('正在处理数据，请稍候...', 'processing');
}

// 测试函数4：测试成功状态
function testSuccess() {
  console.log('测试成功状态...');
  window.updateStatusPopup('操作成功完成！', 'success');
}

// 测试函数5：测试空闲状态
function testIdle() {
  console.log('测试空闲状态...');
  window.updateStatusPopup('准备就绪，等待启动', 'idle');
}

// 测试函数6：循环测试所有状态
function testAllStates() {
  console.log('循环测试所有状态...');

  const states = [
    { text: '正在扫描网站...', type: 'processing' },
    { text: '填充完成！', type: 'success' },
    { text: '出错了！', type: 'error' },
    { text: '准备就绪', type: 'idle' }
  ];

  let index = 0;
  const interval = setInterval(() => {
    if (index >= states.length) {
      clearInterval(interval);
      console.log('所有状态测试完成！');
      return;
    }

    const state = states[index];
    window.updateStatusPopup(state.text, state.type);
    console.log(`测试状态 ${index + 1}/${states.length}: ${state.type}`);
    index++;
  }, 3000);
}

// 测试函数7：测试 setStateText 方法（模拟真实使用场景）
function testSetStateText() {
  console.log('测试 setStateText 方法...');

  // 使用 setStateText 方法（会自动识别状态类型）
  setTimeout(() => {
    window.setStateText('一念职达！为您职达岗位！');
  }, 500);

  setTimeout(() => {
    window.setStateText('正在扫描网站...', 'min');
  }, 2000);

  setTimeout(() => {
    window.setStateText('正在标记简历字段...', 'min');
  }, 3500);

  setTimeout(() => {
    window.setStateText('正在理解简历...', 'show');
  }, 5000);

  setTimeout(() => {
    window.setStateText('开始思考网站填写策略...');
  }, 6500);

  setTimeout(() => {
    window.setStateText('尝试为你填写简历...', 'min');
  }, 8000);

  setTimeout(() => {
    window.setStateText('填写完成！剩下的空就交给你咯~', 'show');
  }, 9500);

  setTimeout(() => {
    window.setStateText('填写出错：网络连接失败，请刷新重试', 'show');
  }, 11000);
}

// 将测试函数暴露到全局
window.statusTest = {
  fullProcess: testFullProcess,
  error: testError,
  processing: testProcessing,
  success: testSuccess,
  idle: testIdle,
  allStates: testAllStates,
  setStateText: testSetStateText
};

console.log(`
==============================================
  状态提示系统测试工具已加载
==============================================

可用的测试函数：

1. statusTest.fullProcess()   - 测试完整填充流程
2. statusTest.setStateText()  - 测试setStateText方法（推荐）
3. statusTest.error()         - 测试错误状态
4. statusTest.processing()    - 测试处理中状态
5. statusTest.success()       - 测试成功状态
6. statusTest.idle()          - 测试空闲状态
7. statusTest.allStates()     - 循环测试所有状态

使用示例：
> statusTest.setStateText()    // 模拟真实填充流程

或者直接调用：
> window.updateStatusPopup('正在扫描网站...', 'processing')
> window.setStateText('正在扫描网站...')

按钮显示效果：
- 处理中：⏸️ 暂停填充：正在扫描网站...（蓝色，呼吸动画）
- 成功：✅ 填充完成（绿色）
- 错误：⚠️ 错误消息（红色，抖动）

支持的状态类型：
- 'processing' (处理中，蓝色，呼吸动画)
- 'success'    (成功，绿色)
- 'error'      (错误，红色，抖动动画)
- 'idle'       (空闲，默认样式)

==============================================
`);
