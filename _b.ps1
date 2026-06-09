$base = "C:\Users\admin\Desktop\xiangmu\duihua"

function BuildCalcPage($file,$icon,$h1,$intro,$inputs,$result,$fn,$js,$howto,$example,$benefits,$mistakes,$faq,$faqSch,$relCalc,$relGuide,$og,$meta) {
  $url="https://numbrly.cc/$file";$t="$h1 — Free Online Calculator | Numbrly"
  return @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta property="og:title" content="$h1 — Free Online Calculator | Numbrly">
<meta property="og:description" content="$og">
<meta property="og:url" content="$url">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="$h1 — Free Online Calculator | Numbrly">
<meta name="twitter:description" content="$og">
<link rel="canonical" href="$url">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>$t</title>
<meta name="description" content="$meta">
<link rel="stylesheet" href="style.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4970468814214538" crossorigin="anonymous"></script>
<script>(function(){var s=localStorage.getItem('theme');if(s)document.documentElement.setAttribute('data-theme',s);else if(window.matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.setAttribute('data-theme','dark');window.toggleTheme=function(){var c=document.documentElement.getAttribute('data-theme');var n=c==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);localStorage.setItem('theme',n);document.getElementById('themeIcon').innerHTML=n==='dark'?'☀️':'🌙';};})();</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Numbrly","item":"https://numbrly.cc/"},{"@type":"ListItem","position":2,"name":"Calculators","item":"https://numbrly.cc/#calculators"},{"@type":"ListItem","position":3,"name":"$h1","item":"$url"}]}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"$h1","url":"$url","description":"$og","applicationCategory":"FinanceApplication","operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[$faqSch]}</script>
</head>
<body>
<nav class="nav"><div class="nav-in"><a href="index.html" class="logo">Num<span>brly</span></a><a href="index.html">Tools</a><a href="index.html#guides">Guides</a><a href="privacy-policy.html">Privacy</a><a href="search.html" style="color:var(--muted);text-decoration:none;font-size:16px;line-height:1">🔍</a><button class="theme-btn" onclick="toggleTheme()" title="Toggle dark mode" id="themeIcon" style="margin-left:auto">🌙</button></div></nav>
<main class="main">
<div class="breadcrumb"><a href="index.html">Numbrly</a> / <a href="index.html#calculators">Calculators</a> / $h1</div>
<section style="margin-top:20px"><h1 style="font-size:28px;font-weight:800;margin-bottom:8px">$icon $h1</h1><p class="sec-desc" style="font-size:15px;max-width:700px">$intro</p></section>
<section><div class="card" style="max-width:640px">$inputs<button class="btn btn-block" onclick="$fn()" style="margin-top:8px">Calculate</button></div><div class="result" id="result" style="max-width:640px">$result</div></section>
<section style="margin-top:40px"><h2>How to Use This Calculator</h2><ol style="color:var(--muted);font-size:14px;line-height:2;padding-left:20px">$howto</ol></section>
$example
<section style="margin-top:40px"><h2>Why Use This Calculator?</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px">$benefits</div></section>
<section style="margin-top:40px"><h2>Common Mistakes</h2><div style="color:var(--muted);font-size:14px;line-height:1.8;margin-top:12px">$mistakes</div></section>
<section style="margin-top:40px"><h2>Frequently Asked Questions</h2><div style="margin-top:16px">$faq</div></section>
<section style="margin-top:40px"><h2>Related Calculators</h2><div class="tool-grid" style="margin-top:16px">$relCalc</div></section>
<section style="margin-top:40px"><h2>Related Guides</h2>$relGuide</section>
</main>
<footer><div class="footer-links"><a href="index.html">Tools</a><a href="index.html#guides">Guides</a><a href="privacy-policy.html">Privacy Policy</a></div><p>&copy; 2026 Numbrly. All calculators are for educational purposes only. Not financial advice.</p></footer>
<script>$js</script>
<script>(function(){var pg=location.pathname.split('/').pop()||'calc';var ins=document.querySelectorAll('input[id],select[id]');try{var sv=JSON.parse(localStorage.getItem('Numbrly_'+pg)||'{}');ins.forEach(function(e){if(sv[e.id]!==undefined)e.value=sv[e.id];});}catch(x){}ins.forEach(function(e){e.addEventListener('input',function(){try{var a={};ins.forEach(function(x){a[x.id]=x.value;});localStorage.setItem('Numbrly_'+pg,JSON.stringify(a));}catch(y){}});});})();document.addEventListener('DOMContentLoaded',function(){$fn();});</script>
</body>
</html>
"@
}
Write-Output "Ready"