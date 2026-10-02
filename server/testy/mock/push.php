<?php
// Atrapa Expo Push do testów: zapisuje wiadomości do REZ_MOCK_DIR/push.json. Token z „Zly” → DeviceNotRegistered.
$plik = (getenv('REZ_MOCK_DIR') ?: sys_get_temp_dir()) . '/push.json';
$lista = is_file($plik) ? (json_decode((string)file_get_contents($plik), true) ?: []) : [];
$wiad = json_decode((string)file_get_contents('php://input'), true) ?: [];
$wyniki = [];
foreach ($wiad as $w) {
    $lista[] = $w;
    $wyniki[] = strpos((string)($w['to'] ?? ''), 'Zly') !== false
        ? ['status' => 'error', 'message' => 'not registered', 'details' => ['error' => 'DeviceNotRegistered']]
        : ['status' => 'ok', 'id' => 'test'];
}
file_put_contents($plik, json_encode($lista, JSON_UNESCAPED_UNICODE));
header('Content-Type: application/json');
echo json_encode(['data' => $wyniki]);
