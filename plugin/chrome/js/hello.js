// 打印 "你好，世界 world"
console.log("你好，世界 world");

// 如果在浏览器环境中，也可以使用 alert
// alert("你好，世界 world");

// 如果是在网页中显示
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        const element = document.createElement('div');
        element.textContent = "你好，世界 world";
        element.style.fontSize = '24px';
        element.style.fontWeight = 'bold';
        element.style.textAlign = 'center';
        element.style.marginTop = '50px';
        document.body.appendChild(element);
    });
}
