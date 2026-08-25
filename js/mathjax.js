window.MathJax = {
  tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
  chtml: { scale: 1.08 },
  options: { enableMenu: false }
};
const mathJaxScript = document.createElement('script');
mathJaxScript.defer = true;
mathJaxScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';
document.head.append(mathJaxScript);
