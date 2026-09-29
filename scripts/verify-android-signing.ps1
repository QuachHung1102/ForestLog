$ErrorActionPreference = 'Stop'

$androidDir = Join-Path $PSScriptRoot '..\android'
$propertyPaths = @(
    (Join-Path ([Environment]::GetFolderPath('UserProfile')) '.gradle\gradle.properties'),
    (Join-Path $androidDir 'gradle.properties')
)
$requiredKeys = @(
    'MYAPP_UPLOAD_STORE_FILE',
    'MYAPP_UPLOAD_KEY_ALIAS',
    'MYAPP_UPLOAD_STORE_PASSWORD',
    'MYAPP_UPLOAD_KEY_PASSWORD'
)
$properties = @{}

foreach ($propertyPath in $propertyPaths) {
    if (Test-Path -LiteralPath $propertyPath -PathType Leaf) {
        foreach ($line in Get-Content -LiteralPath $propertyPath -Encoding utf8) {
            $separator = $line.IndexOf('=')
            if ($separator -gt 0 -and -not $line.TrimStart().StartsWith('#')) {
                $properties[$line.Substring(0, $separator).Trim()] =
                    $line.Substring($separator + 1).Trim()
            }
        }
    }
}

foreach ($key in $requiredKeys) {
    if ([string]::IsNullOrWhiteSpace($properties[$key])) {
        throw "Missing Android signing property: $key"
    }
}

$configuredStore = $properties['MYAPP_UPLOAD_STORE_FILE']
$storePath = if ([System.IO.Path]::IsPathRooted($configuredStore)) {
    $configuredStore
} else {
    Join-Path (Join-Path $androidDir 'app') $configuredStore
}
$storePath = [System.IO.Path]::GetFullPath($storePath)

if (-not (Test-Path -LiteralPath $storePath -PathType Leaf)) {
    throw "Configured Android keystore does not exist: $storePath"
}

$env:FORESTLOG_KEYSTORE_PASSWORD = $properties['MYAPP_UPLOAD_STORE_PASSWORD']
try {
    & keytool -list -keystore $storePath -storepass:env FORESTLOG_KEYSTORE_PASSWORD `
        -alias $properties['MYAPP_UPLOAD_KEY_ALIAS'] *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Keystore password or key alias validation failed.'
    }
} finally {
    Remove-Item Env:FORESTLOG_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
}

[ordered]@{
    configuredProperties = $requiredKeys.Count
    keystoreExists = $true
    aliasValidated = $true
} | ConvertTo-Json
