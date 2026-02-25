<?php
/**
 * GitHub webhook: pull from repo and run cPanel deploy.
 * Set DEPLOY_SECRET and REPO_PATH below, then add this URL as a GitHub webhook (Secret = DEPLOY_SECRET).
 * Optional: move above public_html or restrict by IP in .htaccess.
 */

// ---------- CONFIG (edit these) ----------
define('DEPLOY_SECRET', 'REPLACE_WITH_YOUR_WEBHOOK_SECRET');
define('REPO_PATH', '/home/enkanafresh/repos/enkana_fresh_2');

// cPanel paths (change if your host uses CloudLinux)
define('GIT_BIN', '/usr/local/cpanel/3rdparty/bin/git');
define('UAPI_BIN', '/usr/bin/uapi');
// define('UAPI_BIN', '/usr/local/cpanel/bin/uapi');  // CloudLinux: uncomment this, comment line above

// ---------- Validate GitHub signature ----------
$rawBody = file_get_contents('php://input');
$header  = isset($_SERVER['HTTP_X_HUB_SIGNATURE_256']) ? $_SERVER['HTTP_X_HUB_SIGNATURE_256'] : '';

if (DEPLOY_SECRET === 'REPLACE_WITH_YOUR_WEBHOOK_SECRET' || DEPLOY_SECRET === '') {
    http_response_code(500);
    exit('Webhook secret not configured.');
}

$expected = 'sha256=' . hash_hmac('sha256', $rawBody, DEPLOY_SECRET);
if (!hash_equals($expected, $header)) {
    http_response_code(403);
    exit('Invalid signature.');
}

$payload = json_decode($rawBody, true);
if (!$payload) {
    http_response_code(400);
    exit('Invalid JSON.');
}

// Optional: only deploy on push to main
$ref = isset($payload['ref']) ? $payload['ref'] : '';
if ($ref !== 'refs/heads/main') {
    http_response_code(200);
    exit('Ignored (not main).');
}

// ---------- Pull + deploy ----------
$commands = [
    'cd ' . escapeshellarg(REPO_PATH) . ' && ' . GIT_BIN . ' pull origin main',
    UAPI_BIN . ' VersionControlDeployment create repository_root=' . REPO_PATH,
];

foreach ($commands as $cmd) {
    $out = [];
    $ret = 0;
    @exec($cmd . ' 2>&1', $out, $ret);
    if ($ret !== 0) {
        http_response_code(500);
        exit('Deploy step failed.');
    }
}

http_response_code(200);
header('Content-Type: text/plain');
echo 'OK';
