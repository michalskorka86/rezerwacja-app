<?php
// Atrapa SMSAPI do testów: zapisuje każdy SMS do REZ_MOCK_DIR/sms.json.
$plik = (getenv('REZ_MOCK_DIR') ?: sys_get_temp_dir()) . '/sms.json';
$lista = is_file($plik) ? (json_decode((string)file_get_contents($plik), true) ?: []) : [];
$lista[] = ['to' => $_POST['to'] ?? '', 'message' => $_POST['message'] ?? '', 'auth' => $_SERVER['HTTP_AUTHORIZATION'] ?? ''];
file_put_contents($plik, json_encode($lista, JSON_UNESCAPED_UNICODE));
header('Content-Type: application/json');
echo json_encode(['count' => 1, 'list' => [['id' => 'test', 'points' => 0.16]]]);
