param()

$ErrorActionPreference = 'SilentlyContinue'
$root = 'D:\haoyi'

function Log($msg) { Write-Host $msg }
function Remove-IfExists($path) {
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Recurse -Force
        Log "Removed: $path"
    }
}
function Remove-FileIfExists($path) {
    if (Test-Path -LiteralPath $path -PathType Leaf) {
        Remove-Item -LiteralPath $path -Force
        Log "Removed file: $path"
    }
}

# =============================================================================
# 1. ROOT HTTRACK ARTIFACTS & GA
# =============================================================================
Log "`n=== Phase 1: Root artifacts ==="
Remove-FileIfExists "$root\backblue.gif"
Remove-FileIfExists "$root\fade.gif"
Remove-FileIfExists "$root\cookies.txt"
Remove-FileIfExists "$root\hts-log.txt"
Remove-FileIfExists "$root\index.html"
Remove-FileIfExists "$root\service-worker.js"
Remove-FileIfExists "$root\i.imgur.com.zip"
Remove-FileIfExists "$root\gmail-check"
Remove-FileIfExists "$root\facebook-check.html"
Remove-FileIfExists "$root\threads-check"
Remove-FileIfExists "$root\tiktok-check"
Remove-FileIfExists "$root\twitter-check"
Remove-IfExists "$root\hts-cache"

# =============================================================================
# 2. FOREIGN MIRRORED DOMAINS
# =============================================================================
Log "`n=== Phase 2: Foreign domains ==="
Remove-IfExists "$root\accby.net"
Remove-IfExists "$root\cdn.jsdelivr.net"
Remove-IfExists "$root\telegram.org"
Remove-IfExists "$root\web.telegram.org"
Remove-IfExists "$root\www.humkt.com"
Remove-IfExists "$root\www.humktapp.com"
Remove-IfExists "$root\i.imgur.com"

# =============================================================================
# 3. DUPLICATE HTML VARIANTS
# =============================================================================
Log "`n=== Phase 3: Duplicate HTML variants ==="
$siteRoot = "$root\HaoYi.com"
$duplicates = @(
    'index9ed2.html','indexadee.html',
    'blog34e2.html','blog65b9.html','blogf45c.html',
    'market1cff.html','market451e.html','market6f38.html','market7fa0.html','marketc7cf.html','markete3cf.html',
    'a.html','2fa.html','facebook-check.html','cookie-policy.html'
)
foreach ($f in $duplicates) { Remove-FileIfExists "$siteRoot\$f" }

# =============================================================================
# 4. DUPLICATE CSS
# =============================================================================
Log "`n=== Phase 4: Duplicate CSS ==="
$cssMain = "$siteRoot\assets\templates\basic\css"
Remove-FileIfExists "$cssMain\product-listing.min0199.css"
Remove-FileIfExists "$cssMain\product-listing.min000e.css"

# =============================================================================
# 5. BULK HTML TEXT REPLACEMENTS
# =============================================================================
Log "`n=== Phase 5: Bulk HTML cleanup ==="
$htmlFiles = @(Get-ChildItem -LiteralPath $siteRoot -Recurse -File -Filter *.html -Force)
$total = $htmlFiles.Count
$i = 0

foreach ($file in $htmlFiles) {
    $i++
    if ($i % 500 -eq 0) { Log "Processing $i of $total..." }

    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    # Remove HTTrack mirrored comments (top and bottom)
    $content = [regex]::Replace($content, '<!--\s*Mirrored from[^>]+by HTTrack Website Copier[^>]+-->\s*', '')
    $content = [regex]::Replace($content, '<!--\s*Added by HTTrack\s*-->', '')
    $content = [regex]::Replace($content, '<!--\s*/Added by HTTrack\s*-->', '')
    $content = [regex]::Replace($content, '<meta[^>]*http-equiv="content-type"[^>]*>\s*', '')

    # Remove Google Analytics (gtag) - Multiple variants
    $content = [regex]::Replace($content, '<script async src="https://www\.googletagmanager\.com/gtag/js\?id=[^"]+"></script>\s*\n?', '')
    $content = [regex]::Replace($content, '<script>\s*window\.dataLayer = window\.dataLayer \|\| \[\]\s*;?\s*function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*gtag\("js", new Date\(\)\);\s*gtag\("config", "G-[^"]+"\);?\s*</script>\s*\n?', '')
    $content = [regex]::Replace($content, '<script>\s*window\.dataLayer = window\.dataLayer \|\| \[\]\s*;?\s*function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*gtag\("config", "AW-[^"]+"\);\s*</script>\s*\n?', '')

    # Remove Global site tag comments
    $content = [regex]::Replace($content, '<!-- Global site tag \(gtag\.js\) - Google[^>]+-->\s*\n?', '')
    $content = [regex]::Replace($content, '<!-- Global site tag \(gtag\.js\) - Google Ads:[^>]+-->\s*\n?', '')

    # Remove canonical URLs
    $content = [regex]::Replace($content, '\s*<link rel="canonical"[^>]+>\s*', '')

    # Remove hreflang alternate links
    $content = [regex]::Replace($content, '\s*<link rel="alternate" hreflang="[^"]+"[^>]+>\s*', '')

    # Remove Twitter card meta
    $content = [regex]::Replace($content, '\s*<meta name="twitter:[^>]+>\s*', '')

    # Remove OG meta tags
    $content = [regex]::Replace($content, '\s*<meta property="og:[^>]+>\s*', '')

    # Remove favicon references
    $content = [regex]::Replace($content, '\s*<link rel="shortcut icon"[^>]+>\s*', '')

    # Remove external preconnect/dns-prefetch for fonts/CDNs
    $content = [regex]::Replace($content, '\s*<link rel="preconnect" href="https?://[^"]*"[^>]*>\s*', '')
    $content = [regex]::Replace($content, '\s*<link rel="dns-prefetch" href="https?://[^"]*"[^>]*>\s*', '')

    # Remove external font stylesheets (Google Fonts, Bunny Fonts, CDN fonts)
    $content = [regex]::Replace($content, '\s*<link rel="stylesheet" href="https?://fonts\.[^>]+>\s*', '')

    # Remove inline font-family overrides for external fonts
    $content = [regex]::Replace($content, "<style>\s*:root\s*\{[^}]+\}[^<]*</style>\s*\n?", '')

    # Remove robots meta
    $content = [regex]::Replace($content, '\s*<meta name="robots" content="[^"]*">\s*', '')

    # Remove schema.org structured data JSON-LD
    $content = [regex]::Replace($content, '<script type="application/ld\+json">.*?</script>\s*\n?', '', 'Singleline')

    # Remove CSRF token meta
    $content = [regex]::Replace($content, '\s*<meta name="csrf-token" content="[^"]*">\s*', '')
    $content = [regex]::Replace($content, "window\.csrfToken = '[^']+';\s*\n?", '')

    # Remove currency/rate metas
    $content = [regex]::Replace($content, '\s*<meta name="display-currency"[^>]+>\s*', '')
    $content = [regex]::Replace($content, '\s*<meta name="fx-rates"[^>]+>\s*', '')

    # Remove PWA install prompt scripts
    $content = [regex]::Replace($content, "<script>\s*window\.__pwaInstallPrompt = null;\s*window\.addEventListener\('beforeinstallprompt'[^<]*</script>\s*\n?", '')

    # Remove view-transition meta
    $content = [regex]::Replace($content, '\s*<meta name="view-transition"[^>]+>\s*', '')

    # Replace absolute URLs to HaoYi.com with relative placeholders
    $content = $content -replace 'https?://(www\.)?HaoYi\.com', '/placeholder'

    # Remove copied phone numbers, emails, addresses
    $content = [regex]::Replace($content, '地址[：:]\s*[^<"\n]+', '地址：[REDACTED]')
    $content = [regex]::Replace($content, '电话[：:]\s*[^<"\n]+', '电话：[REDACTED]')
    $content = [regex]::Replace($content, '手机[：:]\s*[^<"\n]+', '手机：[REDACTED]')
    $content = [regex]::Replace($content, '邮箱[：:]\s*[^<"\n]+', '邮箱：[REDACTED]')
    $content = [regex]::Replace($content, 'Email[：:]\s*[^<"\n]+', 'Email：[REDACTED]')
    $content = [regex]::Replace($content, '客服[：:]\s*[^<"\n]+', '客服：[REDACTED]')
    $content = [regex]::Replace($content, 'Telegram[：:]\s*[^<"\n]+', 'Telegram：[REDACTED]')
    $content = [regex]::Replace($content, '微信[：:]\s*[^<"\n]+', '微信：[REDACTED]')
    $content = [regex]::Replace($content, 'QQ[：:]\s*[^<"\n]+', 'QQ：[REDACTED]')

    # Neutralize SEO title/description keywords
    $content = [regex]::Replace($content, '<title>(Telegram|Instagram|Facebook|Gmail|Discord|TikTok|Twitter)[^<]+</title>', '<title>Digital Account Marketplace</title>')

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}

# =============================================================================
# 6. BULK CSS CLEANUP - Remove brand colors, external font refs
# =============================================================================
Log "`n=== Phase 6: Bulk CSS cleanup ==="
$cssFiles = @(Get-ChildItem -LiteralPath $siteRoot -Recurse -File -Filter *.css -Force)
$totalCss = $cssFiles.Count
$j = 0

foreach ($file in $cssFiles) {
    $j++
    if ($j % 200 -eq 0) { Log "Processing CSS $j of $totalCss..." }

    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    # Remove external font face declarations
    $content = [regex]::Replace($content, '@font-face\s*\{[^}]+\}\s*', '')

    # Remove font-family referencing external fonts (keep generic families)
    $content = [regex]::Replace($content, "font-family:\s*'Inter',[^;]+;", 'font-family: system-ui, sans-serif;')
    $content = [regex]::Replace($content, "font-family:\s*'Line Awesome',[^;]+;", 'font-family: inherit;')

    # Neutralize HaoYi brand colors
    $content = [regex]::Replace($content, 'var\(--[a-z-]+\):', 'var(--hy-primary):', 'All')
    $content = [regex]::Replace($content, '#(006fff|0059cc|f97316|16a34a|dc2626)', '#3b82f6')

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}

# =============================================================================
# 7. BULK JS CLEANUP - Remove tracking, unnecessary scripts
# =============================================================================
Log "`n=== Phase 7: Bulk JS cleanup ==="
$jsFiles = @(Get-ChildItem -LiteralPath $siteRoot -Recurse -File -Filter *.js -Force | Where-Object { $_.FullName -notlike "*node_modules*" })
$totalJs = $jsFiles.Count
$k = 0

foreach ($file in $jsFiles) {
    $k++
    if ($k % 500 -eq 0) { Log "Processing JS $k of $totalJs..." }

    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    # Remove gtag tracking
    $content = [regex]::Replace($content, 'gtag\([^)]+\);\s*', '')
    $content = [regex]::Replace($content, 'dataLayer\.push\([^)]+\);\s*', '')
    $content = [regex]::Replace($content, "window\.dataLayer = window\.dataLayer \|\| \[\]\s*;?\s*", '')

    # Remove Google Analytics references
    $content = [regex]::Replace($content, 'googletagmanager\.com/gtag/js', 'placeholder.local/gtag')
    $content = [regex]::Replace($content, 'google-analytics\.com/ga\.js', 'placeholder.local/ga')
    $content = [regex]::Replace($content, 'google-analytics\.com/analytics\.js', 'placeholder.local/analytics')

    # Remove fbq tracking
    $content = [regex]::Replace($content, 'fbq\([^)]+\);\s*', '')

    # Remove external tracking URLs
    $content = [regex]::Replace($content, 'https?://www\.google-analytics\.com/[^"'\''`n`r`s]+', '')
    $content = [regex]::Replace($content, 'https?://www\.googletagmanager\.com/[^"'\''`n`r`s]+', '')
    $content = [regex]::Replace($content, 'https?://connect\.facebook\.net/[^"'\''`n`r`s]+', '')

    # Remove absolute URLs to HaoYi.com
    $content = $content -replace 'https?://(www\.)?HaoYi\.com', '/placeholder'

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}

# =============================================================================
# 8. REMOVE COPYIED IMAGES (keep only essential placeholders)
# =============================================================================
Log "`n=== Phase 8: Clean copied images ==="
$imgDir = "$siteRoot\assets"
# Remove logo images
if (Test-Path "$imgDir\images\logo_icon") {
    Remove-Item "$imgDir\images\logo_icon" -Recurse -Force
    Log "Removed: $imgDir\images\logo_icon"
}
# Remove banner images
if (Test-Path "$imgDir\templates\basic\images\banner-bg.png") {
    Remove-Item "$imgDir\templates\basic\images\banner-bg.png" -Force
    Log "Removed: banner-bg.png"
}
if (Test-Path "$imgDir\templates\basic\images\counter-bg.jpg") {
    Remove-Item "$imgDir\templates\basic\images\counter-bg.jpg" -Force
    Log "Removed: counter-bg.jpg"
}
if (Test-Path "$imgDir\templates\basic\images\not-found.png") {
    Remove-Item "$imgDir\templates\basic\images\not-found.png" -Force
    Log "Removed: not-found.png"
}

# Remove static.fbcdn.net cache
if (Test-Path "$siteRoot\static.xx.fbcdn.net") {
    Remove-Item "$siteRoot\static.xx.fbcdn.net" -Recurse -Force
    Log "Removed: static.xx.fbcdn.net"
}

# Remove placeholder-image if it was copied from original
if (Test-Path "$siteRoot\placeholder-image") {
    Remove-Item "$siteRoot\placeholder-image" -Recurse -Force
    Log "Removed: placeholder-image"
}

# =============================================================================
# 9. REMOVE COPIED JSON DATA (API JSONs)
# =============================================================================
Log "`n=== Phase 9: Clean copied JSON API data ==="
if (Test-Path "$siteRoot\api") {
    Remove-Item "$siteRoot\api" -Recurse -Force
    Log "Removed: api/"
}

# =============================================================================
# 10. CLEANUP BACKEND GENERATED FILES (keep backend core)
# =============================================================================
Log "`n=== Phase 10: Clean backend node_modules (if mirrored) ==="
$backendNodeModules = "$root\backend\node_modules"
if (Test-Path $backendNodeModules) {
    Remove-Item $backendNodeModules -Recurse -Force
    Log "Removed: backend/node_modules"
}

# Remove backend logs
if (Test-Path "$root\backend\logs") {
    Remove-Item "$root\backend\logs" -Recurse -Force
    Log "Removed: backend/logs"
}

# =============================================================================
# 11. FINAL STRUCTURE REPORT
# =============================================================================
Log "`n=== Phase 11: Final structure ==="
$report = @"
Top-level items:
$((Get-ChildItem -LiteralPath $root -Force | Select-Object Name, Length, Mode | Format-Table -AutoSize | Out-String).Trim())

HaoYi.com stats:
  HTML: $((Get-ChildItem -LiteralPath $siteRoot -Recurse -File -Filter *.html -Force).Count)
  CSS:  $((Get-ChildItem -LiteralPath $siteRoot -Recurse -File -Filter *.css -Force).Count)
  JS:   $((Get-ChildItem -LiteralPath $siteRoot -Recurse -File -Filter *.js -Force).Count)
  IMG:  $((Get-ChildItem -LiteralPath $siteRoot -Recurse -Include *.png,*.jpg,*.gif,*.svg,*.webp,*.ico -File -Force).Count)
"@
Log $report

Log "`n=== Cleanup complete ==="
