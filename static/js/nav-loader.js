// 네비게이션 로드
fetch('nav.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('nav-container').innerHTML = html;
    });

