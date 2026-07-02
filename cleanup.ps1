param()

$ErrorActionPreference = 'SilentlyContinue'
$root = 'D:\hstockhub'

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
# 1. ROOT HTTRACK ARTIFACTS
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
$siteRoot = "$root\hstockhub.com"
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
