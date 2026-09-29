param(
    [string]$Source = (Join-Path $PSScriptRoot '..\assets\branding\forestlog-icon-master.png')
)

Add-Type -AssemblyName System.Drawing

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$sizes = [ordered]@{
    'mdpi' = 48
    'hdpi' = 72
    'xhdpi' = 96
    'xxhdpi' = 144
    'xxxhdpi' = 192
}

$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $Source))
try {
    foreach ($entry in $sizes.GetEnumerator()) {
        $bitmap = New-Object System.Drawing.Bitmap($entry.Value, $entry.Value)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($sourceImage, 0, 0, $entry.Value, $entry.Value)
            }
            finally {
                $graphics.Dispose()
            }

            $directory = Join-Path $projectRoot "android\app\src\main\res\mipmap-$($entry.Key)"
            foreach ($name in 'ic_launcher.png', 'ic_launcher_round.png') {
                $path = Join-Path $directory $name
                $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

                $check = [System.Drawing.Image]::FromFile($path)
                try {
                    if ($check.Width -ne $entry.Value -or $check.Height -ne $entry.Value) {
                        throw "Unexpected dimensions for $path"
                    }
                }
                finally {
                    $check.Dispose()
                }
            }
        }
        finally {
            $bitmap.Dispose()
        }
    }
}
finally {
    $sourceImage.Dispose()
}

Write-Output "Android launcher icons updated and verified."
