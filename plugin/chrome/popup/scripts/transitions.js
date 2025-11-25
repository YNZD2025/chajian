// 页面切换动画逻辑
(function() {
    // 导航栏页面顺序（从上到下）
    const navOrder = ['fill.html', 'history.html', 'profile.html', 'settings.html'];

    // 子页面（通过 > 按钮进入的页面）
    const subPages = [
        'edit-resume.html',
        'change-password.html',
        'privacy-settings.html',
        'about.html',
        'help.html',
        'feedback.html'
    ];

    // 获取当前页面名称
    function getCurrentPage() {
        const path = window.location.pathname;
        return path.substring(path.lastIndexOf('/') + 1) || 'fill.html';
    }

    // 获取上一个页面
    function getPreviousPage() {
        return sessionStorage.getItem('previousPage') || '';
    }

    // 保存当前页面作为下一个页面的"上一页"
    function saveCurrentPage() {
        sessionStorage.setItem('previousPage', getCurrentPage());
    }

    // 获取页面在导航栏中的位置
    function getNavIndex(page) {
        return navOrder.indexOf(page);
    }

    // 判断是否是子页面
    function isSubPage(page) {
        return subPages.includes(page);
    }

    // 确定动画方向
    function getAnimationDirection() {
        const currentPage = getCurrentPage();
        const previousPage = getPreviousPage();

        // 没有上一页，使用默认动画
        if (!previousPage) {
            return 'from-bottom';
        }

        const currentNavIndex = getNavIndex(currentPage);
        const previousNavIndex = getNavIndex(previousPage);

        // 当前页面是子页面（从主页面进入子页面）
        if (isSubPage(currentPage) && !isSubPage(previousPage)) {
            return 'from-right';
        }

        // 从子页面返回主页面
        if (!isSubPage(currentPage) && isSubPage(previousPage)) {
            return 'from-left';
        }

        // 子页面之间切换
        if (isSubPage(currentPage) && isSubPage(previousPage)) {
            return 'from-right';
        }

        // 导航栏页面之间切换
        if (currentNavIndex !== -1 && previousNavIndex !== -1) {
            if (currentNavIndex > previousNavIndex) {
                // 向下导航（从上面的页面到下面的页面）
                return 'from-bottom';
            } else if (currentNavIndex < previousNavIndex) {
                // 向上导航（从下面的页面到上面的页面）
                return 'from-top';
            }
        }

        // 默认动画
        return 'from-bottom';
    }

    // 应用动画
    function applyAnimation() {
        const mainArea = document.querySelector('.main-area');
        if (!mainArea) return;

        const direction = getAnimationDirection();
        mainArea.classList.add('animate-' + direction);
    }

    // 为所有链接添加点击事件，保存当前页面
    function setupLinkTracking() {
        document.querySelectorAll('a[href]').forEach(link => {
            link.addEventListener('click', function() {
                saveCurrentPage();
            });
        });
    }

    // 页面加载时执行
    document.addEventListener('DOMContentLoaded', function() {
        applyAnimation();
        setupLinkTracking();
    });
})();
