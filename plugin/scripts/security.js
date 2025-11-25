// 安全防护 - 禁用非法交互
(function() {
    'use strict';

    // 禁用右键菜单
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // 禁用键盘快捷键
    document.addEventListener('keydown', function(e) {
        // 禁用 F12 (开发者工具)
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // 禁用 Ctrl+Shift+I (开发者工具)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
        }

        // 禁用 Ctrl+Shift+J (控制台)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            return false;
        }

        // 禁用 Ctrl+U (查看源代码)
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            return false;
        }

        // 禁用 Ctrl+S (保存页面)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            return false;
        }

        // 禁用 Ctrl+A (全选) - 只在非输入框时
        if (e.ctrlKey && e.key === 'a') {
            const activeElement = document.activeElement;
            const isInput = activeElement.tagName === 'INPUT' ||
                           activeElement.tagName === 'TEXTAREA' ||
                           activeElement.isContentEditable;
            if (!isInput) {
                e.preventDefault();
                return false;
            }
        }

        // 禁用 Ctrl+C (复制) - 只在非输入框时
        if (e.ctrlKey && e.key === 'c') {
            const activeElement = document.activeElement;
            const isInput = activeElement.tagName === 'INPUT' ||
                           activeElement.tagName === 'TEXTAREA' ||
                           activeElement.isContentEditable;
            if (!isInput) {
                e.preventDefault();
                return false;
            }
        }

        // 禁用 Ctrl+P (打印)
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            return false;
        }
    });

    // 禁用拖拽
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });

    // 禁用选择文本（非输入框）
    document.addEventListener('selectstart', function(e) {
        const target = e.target;
        const isInput = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.isContentEditable;
        if (!isInput) {
            e.preventDefault();
            return false;
        }
    });

    // 禁用复制（非输入框）
    document.addEventListener('copy', function(e) {
        const activeElement = document.activeElement;
        const isInput = activeElement.tagName === 'INPUT' ||
                       activeElement.tagName === 'TEXTAREA' ||
                       activeElement.isContentEditable;
        if (!isInput) {
            e.preventDefault();
            return false;
        }
    });

    // 禁用剪切（非输入框）
    document.addEventListener('cut', function(e) {
        const activeElement = document.activeElement;
        const isInput = activeElement.tagName === 'INPUT' ||
                       activeElement.tagName === 'TEXTAREA' ||
                       activeElement.isContentEditable;
        if (!isInput) {
            e.preventDefault();
            return false;
        }
    });

})();
