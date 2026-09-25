<#
Checks a hand-copied folder of this repository against the repository itself.

On a machine without git, files are downloaded from GitHub one at a time, and
one is easily missed, left at an old version, or saved by the browser as
"name (1).ext" beside the old copy. This script hashes every file the
repository has, names each one that is missing or not the current version, and
prints its download URL.

The list it checks against is embedded at the end of this script, so this is
the one file to download fresh before every run: an old copy checks the folder
against an old list and reports it current.

Read-only. Safe to run any time.

Usage (or double-click check.cmd):
  .\check.ps1                        check every file
  .\check.ps1 -Only dashboard,skills check these folders only
  .\check.ps1 -ShowExtra             also list local files the repository does not have
  .\check.ps1 -Open                  open the download URL of every missing or outdated file
#>
param(
    [string[]]$Only = @(),
    [switch]$ShowExtra,
    [switch]$Open
)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$sep = [IO.Path]::DirectorySeparatorChar
$rawBase = "https://raw.githubusercontent.com/dallmi/html-report-kit/main"
# Folders that never come from the repository, and are not walked for extras.
$skipDirs = @(".git", ".venv", "__pycache__", "node_modules", "pictures", "_to_delete", "_out")
$skipFiles = @("check.ps1", ".DS_Store", "Thumbs.db", "desktop.ini")

# Same hash as scripts/check_manifest.py: SHA-256, CRLF read as LF unless the
# file has a NUL byte in its first 8000 bytes (git's test for binary).
$latin1 = [Text.Encoding]::GetEncoding(28591)
$sha256 = [Security.Cryptography.SHA256]::Create()
function Get-ContentHash([string]$file) {
    $bytes = [IO.File]::ReadAllBytes($file)
    $probe = [Math]::Min($bytes.Length, 8000)
    if ([Array]::IndexOf($bytes, [byte]0, 0, $probe) -lt 0) {
        $bytes = $latin1.GetBytes($latin1.GetString($bytes).Replace("`r`n", "`n"))
    }
    [BitConverter]::ToString($sha256.ComputeHash($bytes)).Replace("-", "").ToLowerInvariant()
}

function Get-DownloadUrl([string]$path) {
    $rawBase + "/" + ((($path -split "/") | ForEach-Object { [Uri]::EscapeDataString($_) }) -join "/")
}

function Get-LocalFiles([string]$dir, [string]$rel) {
    foreach ($item in Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue) {
        $path = if ($rel) { "$rel/$($item.Name)" } else { $item.Name }
        if ($item.PSIsContainer) {
            if ($skipDirs -notcontains $item.Name) { Get-LocalFiles $item.FullName $path }
        }
        elseif ($skipFiles -notcontains $item.Name) { $path }
    }
}

# A browser that finds the file already there saves "name (1).ext"; one that
# serves text as text/plain may save "name.ext.txt". Either way the file lands
# beside the one it was meant to replace.
function Get-IntendedPath([string]$path) {
    if ($path -match '^(?<base>.*?) ?\(\d+\)(?<ext>\.[^./]*)?$') { return $Matches.base + $Matches.ext }
    if ($path -match '^(?<base>.+\.[^./]+)\.txt$') { return $Matches.base }
    return $null
}

function Test-InScope([string]$path) {
    if ($scope.Count -eq 0) { return $true }
    foreach ($folder in $scope) {
        if ($path -eq $folder -or $path.StartsWith("$folder/", [StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
    return $false
}

# BEGIN MANIFEST - written by scripts/check_manifest.py from the git index, never edit by hand
$manifestVersion = "de3dac933694"
$manifestText = @'
b78ddde196890da84334815589a255c66c44d8499ebb5f305c6c3ff8ee77e743  README.md
239624d46cb7ea765b9d692d174cd67e862c38ea6d4131cc5fa3d03b041e5f40  check.cmd
14cf8126e1cc7fcc238b9ff5a7a3e476daa873373393a1274637161d68abcd6d  dashboard/comms-intelligence-dashboard-demo.html
97c0f3ee6db9b5bd89c48aa8ed5f8cbbe4182f1bd5f6f0930da1c0a854f4dc93  dashboard/comms-intelligence-dashboard-v3-demo.html
658c54e5c79d472cd0782bb2c5b98082a79531a0f52b2adf521906c93c1dc730  dashboard/compare.html
ed9aa3fbc66cec9c6c2851f5416a248e3095b2a3a0bd0a50dddb5ac87031af42  dashboard/template-v3.html
c96ba3dcf9c026faf3c082ad33c66f1ef428fa09d27aea78632008f295625cb4  dashboard/template.html
9103dbf8f2b4d4c9c146803fe1f0f57456871f9389148be11a4a00e22b3119cb  docs/superpowers/plans/2026-09-24-redesign-skill.md
1a461ed5a7fbfdd339fbd9db872e1f9230fb915ae9e83f70f1d34588f69d7d10  docs/superpowers/specs/2026-09-24-redesign-skill-design.md
a3fceb8ccac2fd76ba6e068a967f7d27845e3591dc404756869ea3ebe91f6747  option-b/README.md
491483bb85d87055740fe4397126d43e02ed425a68d6644fe21c49e50849115f  option-b/assets/styles-v2.css
6f93b2e35901480ed512ce05f950e1ee161d804592c0db108170e509389640fb  option-b/assets/styles.css
0ee6b38602e9232f42dcde2f54e34dfad3862e61802649bd86fd8f5930ed092a  option-b/assets/tokens.css
e65ae47f1afe3b11cf73a3dcabd9d4c00baca993f33a0ecf6dcefb9927252c99  option-b/index.html
3bed28a1fa9df1a8f6aaaf6726ac34a9a45b5162c98e838e90c177f3bcad959c  option-b/index2.html
7a21b2a0549550bc14c4788520431c6d5e6b1a9c9eb7d5c895339ba9796c3761  option-b/overrides.yaml
db9d7c2dcaeaaf5447c3737265909fbeb533da043aa0c68fe9b0cab283f71fe5  option-b/scripts/build_clarity_data.py
100bad68251703976689fe99387132684e9762c5cf7f8e4e6cceebf79e8356d1  option-b/scripts/parity_check.cjs
9a024898809bad077be1343edcc585e7b802d5d1c462daf4ab5a097637a5cb21  option-b/src/boot.js
70ebafdf09dd7ac1c096717121ee55fef9398320da98c71baf4c66558953f0af  option-b/src/components/blocks.js
7bda67564f01ef12d4e1769297b602bd364a02d44ee92e6e2a63a59c24f004e8  option-b/src/components/charts.js
a792a6fcdbf042872e16368ced51faa456f20cd5531fa95e938fc74bf9e6cf8d  option-b/src/components/drawer.js
0b865464a29f4542859c0529c9c6c66998b679349aba8987f8a7155cabe6254b  option-b/src/components/filterbar.js
35bb7131d94843f2b86f13eb65784a203b5aa710bfbfa648a290ca934cda3fcc  option-b/src/components/svg.js
482e5a78f4164f7a5d5ff6efff4fc81c382e66c9e03ba8229cbd0ac16a2f363d  option-b/src/components/v2/blocks.js
ef327fd77c80a04a824c74f3eddea5fbba6293c29d80d856f5d1bad902860816  option-b/src/components/v2/charts.js
92ad47f49f0fe18f98e222d2442d88ca7100b7524ff415b2dbaa0262ef8bd378  option-b/src/data/decode.js
2f624cc401975af31f6a82c7a9f2b310f5dd3cd80c6e3478be901750978a3ec2  option-b/src/data/loader.js
a6474041e693ec6bd2556e550813ffdadcc1506240cb0aa1c6f166296a38cfc6  option-b/src/main-v2.js
1fc964a27bd34ca7541effdb0fbe838a618a50ec44e2620b427c555322a99af4  option-b/src/main.js
2ab74f7bb58bffa8321982745fb8d20ad03362644a2dcacb775293fc0e02fa61  option-b/src/services/aggregate.js
1d66e66ea201cddfe54f5600846cdba1e3473edd56361b9227284c877507e56d  option-b/src/services/filter.js
2bb3c187844de52fb43d07b829ef894f03a422788ccbee5193b9b979cebcabea  option-b/src/services/format.js
e70085e8252b8a2a31c4893ac67080d48b7478a0c9031008332e6ca29e2ad1c8  option-b/src/services/metrics.js
c3f0881e59c8e8b0d1c3cccdf88dbf09c2b1b18754236e4caccdb3b6f1e58c9f  option-b/src/services/period.js
95ad979a2d0f28c4148d30e9d3cd2c13dd5cb697963986b04f485140891c624d  option-b/src/state/store.js
16737c42e66ab4939807bcc0fe32b2b17e4bc138825ed79c44c4ae7969e36ab6  option-b/src/viewmodels/articles.js
ceddca7633972732f4e38513ce153a5c3f0e45cdb7d112cf7fe4c419fd387605  option-b/src/viewmodels/clicks.js
dfd91301ec4c5d07f91cb9e60c6db7c67afc007e69c8874d809542908ed24750  option-b/src/viewmodels/csv.js
3aec329489d08e6f723593073afa3c8ed8af192654c184a80bf596ae1df88e00  option-b/src/viewmodels/email.js
fa839d3e963cf3b69d91f7026bf2a6f62d7717ce205c948f06edd3d6d546e575  option-b/src/viewmodels/explore.js
da56f7342c9f44eef6dd5e5703b0d61ee28792b4b9d96ac0b2d2afcff49bcb7a  option-b/src/viewmodels/filters.js
c9c23ce95db5d2c4e343dcf57287e2a70ece14da8a52073967e7f933b7ce9569  option-b/src/viewmodels/method.js
5c9c427dcd4be9c0344a4e3bb5a24da62ce6e519caaa2567655bc27af1db21f8  option-b/src/viewmodels/pages.js
a369e18a723332d2ad385156b4fffb8e5ce7756439375bc38a644b7a3ff13a38  option-b/src/viewmodels/summary.js
b138a02f045d1ef2618d69776edd8a7fb2241027b0609f7192d4787dede951ba  option-b/src/viewmodels/v2/articles.js
d4d7bb56c3464a0f618689d52b9abecfaaaf3ac3b12a8b182e14e7b9e07467ac  option-b/src/viewmodels/v2/breakdown.js
c6c7b483e8a033cd1469087361da3f26f20c6a506790cb9593315f3c1242fa9e  option-b/src/viewmodels/v2/clicks.js
8382c44386b3bd5c3336a866f021d9444413a5a592f378a7c493b7b34c7f2233  option-b/src/viewmodels/v2/csv.js
b17713af41fb939c1dcfecd0a555416764b88240836e80a61e1d0a474d0bc027  option-b/src/viewmodels/v2/interpret.js
da482cf76f216b851b2f0a73392440799dd90e27c2de1f53824fcb1fb2fbfbad  option-b/src/viewmodels/v2/mailings.js
6e7e6aa4989f2a04a6c838e485449deedb6f2a5f1dbee59abfb91464ce16fd94  option-b/src/viewmodels/v2/overview.js
374603c15d4af3774008eb4d8a19d33b116fd3075182a2baf29f11d80501712e  option-b/src/viewmodels/v2/pages.js
85371fd1e3180adba937094c8b51e26eed287c054b30fc888d9a3371504e5284  option-b/src/viewmodels/v2/panel.js
941c045ed4f41c05b05caa810bb9d1b62b7e978e36b20d2740d77bb29ccfe0f1  option-b/src/viewmodels/v2/videos.js
66c7946146bebe4f49ca0011f43f97d7304a528fdaa076c00b0cdbfe833a2a19  option-b/src/viewmodels/video.js
5dc6784393f0031f73d5b6c1730c3f40ba57b7159cfcef50a2af3ad3f66ee5ce  option-b/src/views/tabs.js
d68de19b6082cb3e6c1f24a07930361be6f88a7805ae7dfade385b5336f23349  option-b/src/views/v2/tabs.js
8783e6c9bb335a813c62630986ea86632ad4e0164917d7740a1b46024f82a3e4  scripts/build_demo.py
93fce52ac370bc7397ce1dd463546a47f4eb517382db3e225c839e40ea50eeb6  scripts/build_test_dashboards.py
2e19185b85f4b24977fa8826f648eabeaefb739ec651d39ddca69cc172b8488b  scripts/check_manifest.py
a587355c339aa5679591a6cba805e70763e6c5d832442346b07e65f7f635efe3  scripts/redesign_skill_tool.py
52ad05a58f5062c8ffb6c5d7574f2301a13cc0fd6af0cb870756ae3d3bfb90db  scripts/score_extraction.py
3c67f72ea991491566ee0da0ad0cdcb84312b3e56ff79e61a9d6974708fe1f41  scripts/tests/fixtures/02-layout.json
8cd4a0972ad4acb782c246edc3f9f258c09afbd82b42432a5f209ce55f24f5a3  scripts/tests/test_check_manifest.py
30ed9084fb91828914df74aefcfcdf34f1195f1546e3deffafe90c384f41c965  scripts/tests/test_redesign.py
83172204c1d29e546f713bcfd7dfa52201f234c24091829ce58cb3e736a6018c  skills/comms-dashboard-to-excel/SKILL.md
a3c396219a53ab14d5fe63444c0d462f94c02f90f95a6f00e1308a4e96d3d76b  skills/comms-dashboard-to-excel/agent-instructions.txt
83172204c1d29e546f713bcfd7dfa52201f234c24091829ce58cb3e736a6018c  skills/comms-dashboard-to-excel/comms-dashboard-to-excel.txt
8ce35c8c11cf9f8875b590f8896dd378af71ecdc62b3081a6051c44f8edc495b  skills/comms-dashboard-v3-fill/SKILL.md
8f9cf5116288eea0266e1acb0e9de187923cfd2cdc9015632cd7f28a54ca5994  skills/corporate-html-rebrand/SKILL.md
6dc3492c12f8805eef3874c81e64d01dec0076f7a7bd7f572da3d7e1fb21c8d4  skills/corporate-pptx-rebrand/SKILL.md
793907c5daf547ad06ff114c2d3df3daecb072dd14c89d5a3d9cc7982e743761  skills/html-dashboard-to-excel/SKILL.md
9ec039c4b5a602454544606e23f1e0804c3d9e5a225f2425702d3fee6c27f228  skills/redesign/SKILL.md
1052c1d8b84bc02eaaa2b5b5c573051f00befa9fb997a53f73cdce7c20889c9f  skills/redesign/agent-instructions.txt
9ec039c4b5a602454544606e23f1e0804c3d9e5a225f2425702d3fee6c27f228  skills/redesign/redesign.txt
a16802f77aaa469f441cdbbebc2e73da7f1e4f08477400b73613e569a5655963  test-dashboards/01-intranet-plotly.html
4029d21520c6f080eb3e1294d853dc06dfd44646da04677e8d9b5c4ed9b9dda4  test-dashboards/02-newsletter-chartjs.html
11620657c5004c398f16be3a12838f4cfb98f752c8de1fcc17f7a60af7dec7fe  test-dashboards/03-video-echarts.html
438ddae52ab5bbffd3a7e0031fd2ec54c04f50932e0ea8568b1662c8c06e5cf1  test-dashboards/04-campaign-static.html
e0a9c59aab4ec520613ca84da21e5cc253e43b953bbbb6a5063d22fc5c297877  test-dashboards/05-events-fetch/data/registrations.csv
77240061378584c0081447e9ada44ef754c7741d9ff06aabefb1cf257fb367cb  test-dashboards/05-events-fetch/data/sessions.json
38a5fda046a328a0d94421085b9c30cb9d1253b6dbb3ca4fadda3f0b8b349360  test-dashboards/05-events-fetch/index.html
72e3727a483c23102c7f5abb5336da0dfb60565ed9c74aa8cc0ed71b2dd39ec6  test-dashboards/06-articles-vite.html
a4d7f615d7a7d63392cb8367a2ab9fdd43ea9d81870efaa3d4475e63de316d69  test-dashboards/expected.json
'@
# END MANIFEST

# check.cmd passes "-Only a,b" as one string; split it here.
$scope = @($Only | ForEach-Object { $_ -split "," } | ForEach-Object { $_.Trim().Replace("\", "/").Trim("/") } | Where-Object { $_ })

$manifest = @(foreach ($line in ($manifestText -split "`n")) {
    if ($line.TrimEnd("`r") -match '^(?<hash>[0-9a-f]{64})  (?<path>.+)$') {
        [pscustomobject]@{ Path = $Matches.path; Hash = $Matches.hash }
    }
})
$byPath = @{}
foreach ($entry in $manifest) { $byPath[$entry.Path.ToLowerInvariant()] = $entry }
$manifest = @($manifest | Where-Object { Test-InScope $_.Path })

Write-Host ""
Write-Host "=== File check (manifest $manifestVersion, $($manifest.Count) files) ===" -ForegroundColor Cyan
Write-Host "  This script cannot check itself - download it fresh before each run:"
Write-Host "  $(Get-DownloadUrl 'check.ps1')"
if ($scope.Count) { Write-Host "  Only: $($scope -join ', ')" }
if ($manifest.Count -eq 0) {
    Write-Host "  Nothing to check - no repository file under: $($scope -join ', ')" -ForegroundColor Yellow
    exit 1
}

# Local files that are not repository files: misnamed downloads, and the rest.
$variants = @{}
$extras = @()
foreach ($path in Get-LocalFiles $root "") {
    if ($byPath.ContainsKey($path.ToLowerInvariant())) { continue }
    $intended = Get-IntendedPath $path
    if ($intended -and $byPath.ContainsKey($intended.ToLowerInvariant())) {
        $key = $intended.ToLowerInvariant()
        if (-not $variants.ContainsKey($key)) { $variants[$key] = @() }
        $variants[$key] += $path
    }
    elseif (-not $path.Split("/")[-1].StartsWith(".") -and (Test-InScope $path)) { $extras += $path }
}

Write-Host ""
$downloads = @()
$ok = 0
foreach ($entry in $manifest) {
    $full = Join-Path $root ($entry.Path.Replace("/", $sep))
    $key = $entry.Path.ToLowerInvariant()
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { $state = "MISSING " }
    elseif ((Get-ContentHash $full) -ne $entry.Hash) { $state = "OUTDATED" }
    else {
        $ok++
        foreach ($copy in $variants[$key]) {
            Write-Host ("  LEFTOVER {0}  (a second copy of {1}, which is current - delete it)" -f $copy, $entry.Path) -ForegroundColor Yellow
        }
        continue
    }
    Write-Host ("  {0} {1}" -f $state, $entry.Path) -ForegroundColor Red
    $fixed = $false
    foreach ($copy in $variants[$key]) {
        if ((Get-ContentHash (Join-Path $root ($copy.Replace("/", $sep)))) -eq $entry.Hash) {
            $fixed = $true
            $how = if ($state -eq "MISSING ") { "rename it" } else { "delete the old file, then rename it" }
            Write-Host ("           the current version is already here as '{0}' - {1}" -f $copy, $how) -ForegroundColor Yellow
        }
        else {
            Write-Host ("           '{0}' is here too, but it is not the current version either" -f $copy) -ForegroundColor Yellow
        }
    }
    if (-not $fixed) { $downloads += $entry.Path }
}

Write-Host ""
if ($extras.Count) {
    if ($ShowExtra) {
        Write-Host "=== Local files the repository does not have ===" -ForegroundColor Cyan
        foreach ($path in $extras) { Write-Host "  EXTRA    $path" }
        Write-Host ""
    }
    else {
        Write-Host "  $($extras.Count) local file(s) the repository does not have (outputs, data, notes) - list them with -ShowExtra"
        Write-Host ""
    }
}

$bad = $manifest.Count - $ok
if ($bad -eq 0) {
    Write-Host "RESULT: all $ok files current." -ForegroundColor Green
    exit 0
}
Write-Host "RESULT: $ok of $($manifest.Count) files current, $bad not." -ForegroundColor Red
if ($downloads.Count) {
    Write-Host ""
    Write-Host "Download these and save each under its path above, replacing the old file:" -ForegroundColor Red
    foreach ($path in $downloads) {
        $url = Get-DownloadUrl $path
        Write-Host "  $url"
        if ($Open) { Start-Process $url }
    }
}
exit 1

