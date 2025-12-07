/**
 * 状态提示系统测试脚本
 * 在浏览器控制台运行此脚本来测试不同的状态效果
 */

// 测试函数1：模拟完整的填充流程
function testFullProcess() {

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
  window.updateStatusPopup('填写出错：网络连接失败，请刷新重试', 'error');
}

// 测试函数3：测试处理中状态
function testProcessing() {
  window.updateStatusPopup('正在处理数据，请稍候...', 'processing');
}

// 测试函数4：测试成功状态
function testSuccess() {
  window.updateStatusPopup('操作成功完成！', 'success');
}

// 测试函数5：测试空闲状态
function testIdle() {
  window.updateStatusPopup('准备就绪，等待启动', 'idle');
}

// 测试函数6：循环测试所有状态
function testAllStates() {

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
      return;
    }

    const state = states[index];
    window.updateStatusPopup(state.text, state.type);
    index++;
  }, 3000);
}

// 测试函数7：测试 setStateText 方法（模拟真实使用场景）
function testSetStateText() {

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

