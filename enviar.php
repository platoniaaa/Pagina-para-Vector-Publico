<?php
/* Vector Público · envío del formulario de contacto por correo
   Recibe el formulario de contacto.html y lo manda a DESTINO con mail() del hosting (cPanel).
   Con JavaScript (site.js) responde JSON; sin JavaScript muestra una página simple de confirmación.
   Compatible con PHP 7.4 o superior. */

declare(strict_types=1);
date_default_timezone_set('America/Santiago');

/* ---------- Configuración ---------- */
const DESTINO   = 'contacto@vpublico.cl';  /* casilla que recibe las consultas */
const REMITENTE = 'contacto@vpublico.cl';  /* debe ser una casilla del dominio para pasar SPF y DKIM */
const NOMBRE_REMITENTE = 'Sitio web Vector Público';
const MAX_POR_HORA = 5;                     /* envíos por IP y hora */
const WHATSAPP = 'https://wa.me/56995372764';

$TEMAS = [
  'diagnostico-general'       => 'Diagnóstico general',
  'planificacion-estrategica' => 'Planificación estratégica y desarrollo territorial',
  'transformacion-digital'    => 'Transformación digital y modernización municipal',
  'control-interno'           => 'Control interno y gestión de riesgos',
  'gestion-de-personas'       => 'Gestión de personas y estructura organizacional',
  'ciberseguridad'            => 'Ciberseguridad, gobierno de datos y continuidad operacional',
  'proteccion-de-datos'       => 'Protección de datos personales, Ley 21.719',
];

/* ---------- Utilidades ---------- */
$quiereJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function responder(bool $ok, string $mensaje, array $errores = [], int $codigo = 200): void {
  global $quiereJson;
  http_response_code($codigo);
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: no-store');
  if ($quiereJson) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => $ok, 'message' => $mensaje, 'errors' => (object) $errores], JSON_UNESCAPED_UNICODE);
    exit;
  }
  header('Content-Type: text/html; charset=utf-8');
  $titulo = $ok ? 'Recibimos tu consulta' : ($errores ? 'Faltan datos en tu consulta' : 'No pudimos enviar tu consulta');
  /* esta página no marca campos: se listan los errores en texto */
  $detalle = $errores ? 'Revisa lo siguiente: ' . implode(' ', $errores) : $mensaje;
  $h = function (string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); };
  echo '<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="robots" content="noindex">'
     . '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' . $h($titulo) . ' · Vector Público</title>'
     . '<link rel="stylesheet" href="assets/site.css"></head><body><main class="section"><div class="wrap" style="max-width:640px">'
     . '<p class="kicker">Contacto</p><h1>' . $h($titulo) . '</h1><p class="lede">' . $h($detalle) . '</p>'
     . '<div class="actions" style="margin-top:28px;display:flex;flex-wrap:wrap;gap:12px">'
     /* volver con el historial conserva lo escrito; el enlace queda de respaldo */
     . ($ok ? '<a class="btn" href="index.html">Volver al inicio</a>'
            : '<a class="btn" href="contacto.html#formulario" onclick="history.back();return false">Volver al formulario</a>')
     . '<a class="btn btn-ghost" href="' . WHATSAPP . '" target="_blank" rel="noopener">Escribir por WhatsApp</a>'
     . '</div></div></main></body></html>';
  exit;
}

/* quita saltos de línea y caracteres de control: evita que un campo agregue cabeceras al correo */
function limpiar(string $v, int $max): string {
  $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
  $v = trim(preg_replace('/\s+/u', ' ', $v) ?? '');
  return function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : substr($v, 0, $max);
}
function largo(string $v): int { return function_exists('mb_strlen') ? mb_strlen($v, 'UTF-8') : strlen($v); }
function cabecera(string $s): string { return '=?UTF-8?B?' . base64_encode($s) . '?='; }

/* ---------- Solo POST ---------- */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  header('Allow: POST');
  responder(false, 'Este enlace solo recibe el formulario de contacto.', [], 405);
}

/* ---------- Trampas para robots ---------- */
/* campo oculto que una persona no ve ni completa */
if (trim((string) ($_POST['sitio_web'] ?? '')) !== '') responder(true, 'Gracias. Te responderemos a la brevedad.');
/* con JavaScript, site.js informa cuántos segundos estuvo abierta la página: un envío en menos de 3 s es de un robot */
$segundos = $_POST['t'] ?? '';
if ($segundos !== '' && is_numeric($segundos) && (float) $segundos < 3) responder(true, 'Gracias. Te responderemos a la brevedad.');

/* ---------- Límite de envíos por IP ---------- */
$ip = $_SERVER['REMOTE_ADDR'] ?? 'sin-ip';
$registro = rtrim(sys_get_temp_dir(), '/\\') . '/vp-form-' . hash('sha256', $ip) . '.json';
$ahora = time();
$envios = [];
if (is_readable($registro)) {
  $envios = json_decode((string) @file_get_contents($registro), true) ?: [];
  $envios = array_values(array_filter($envios, function ($t) use ($ahora) { return is_int($t) && $t > $ahora - 3600; }));
}
if (count($envios) >= MAX_POR_HORA) {
  responder(false, 'Recibimos varios envíos desde tu conexión. Intenta en una hora o escríbenos por WhatsApp.', [], 429);
}

/* ---------- Validación ---------- */
$nombre   = limpiar((string) ($_POST['nombre'] ?? ''), 100);
$correo   = limpiar((string) ($_POST['correo'] ?? ''), 254);
$telefono = limpiar((string) ($_POST['telefono'] ?? ''), 30);
$muni     = limpiar((string) ($_POST['municipalidad'] ?? ''), 120);
$cargo    = limpiar((string) ($_POST['cargo'] ?? ''), 120);
$temaKey  = (string) ($_POST['tema'] ?? 'diagnostico-general');
$tema     = $TEMAS[$temaKey] ?? $TEMAS['diagnostico-general'];
/* el mensaje conserva sus saltos de línea: va solo en el cuerpo del correo.
   El navegador cuenta cada salto como un carácter pero lo envía como CRLF: se normaliza antes de recortar */
$mensaje  = str_replace(["\r\n", "\r"], "\n", (string) ($_POST['mensaje'] ?? ''));
$mensaje  = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $mensaje) ?? '');
$mensaje  = function_exists('mb_substr') ? mb_substr($mensaje, 0, 3000, 'UTF-8') : substr($mensaje, 0, 3000);
$acepta   = !empty($_POST['acepta']);

$errores = [];
if (largo($nombre) < 2) $errores['nombre'] = 'Escribe tu nombre.';
if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) $errores['correo'] = 'Revisa tu correo electrónico.';
$digitos = preg_replace('/\D/', '', $telefono) ?? '';
if (strlen($digitos) < 8 || strlen($digitos) > 15 || !preg_match('/^[0-9+()\s.-]+$/', $telefono)) $errores['telefono'] = 'Revisa tu teléfono o celular.';
if (largo($mensaje) < 10) $errores['mensaje'] = 'Cuéntanos tu necesidad en al menos una frase.';
if (!$acepta) $errores['acepta'] = 'Debes aceptar la política de privacidad.';

if ($errores) responder(false, 'Revisa los campos marcados.', $errores, 422);

/* ---------- Correo ---------- */
$asunto = 'Consulta web: ' . $tema . ($muni !== '' ? ' · ' . $muni : '');
$cuerpo = "Nueva consulta desde el formulario de vpublico.cl\n\n"
        . "Nombre: {$nombre}\n"
        . "Correo: {$correo}\n"
        . "Teléfono: {$telefono}\n"
        . 'Municipalidad: ' . ($muni !== '' ? $muni : '(no indicada)') . "\n"
        . 'Cargo: ' . ($cargo !== '' ? $cargo : '(no indicado)') . "\n"
        . "Tema: {$tema}\n\n"
        . "Necesidad o requerimiento:\n{$mensaje}\n\n"
        . "--\nEnviado el " . date('d-m-Y H:i') . ". Responde este correo para contestarle directamente a {$nombre}.\n";

$cabeceras = implode("\r\n", [
  'From: ' . cabecera(NOMBRE_REMITENTE) . ' <' . REMITENTE . '>',
  'Reply-To: ' . cabecera($nombre) . ' <' . $correo . '>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: 8bit',
  'X-Mailer: vpublico.cl',
]);

/* -f fija el remitente del sobre en la casilla del dominio (alineación con SPF) */
$enviado = @mail(DESTINO, cabecera($asunto), $cuerpo, $cabeceras, '-f' . REMITENTE);

if (!$enviado) {
  responder(false, 'No pudimos enviar tu consulta en este momento. Intenta de nuevo o escríbenos por WhatsApp.', [], 500);
}

$envios[] = $ahora;
@file_put_contents($registro, json_encode($envios), LOCK_EX);

responder(true, 'Gracias, ' . $nombre . '. Recibimos tu consulta y te responderemos a la brevedad, en horario hábil.');
