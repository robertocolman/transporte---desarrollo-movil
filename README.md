# Transporte Publico - Parana

Trabajo Practico Integrador Final  
Catedra: Desarrollo para Moviles  
Tecnicatura Universitaria en Desarrollo Web  
Facultad de Ciencias de la Administracion - Universidad Nacional de Entre Rios (UNER)

## Descripcion del Proyecto

Aplicacion movil desarrollada con React Native y Expo para la gestion y consulta de la red de transporte urbano de colectivos de la ciudad de Parana, Entre Rios, segun las especificaciones del documento de requerimientos (PRD) de la Direccion de Transporte.

La aplicacion permite consultar lineas urbanas, recorridos de ida y vuelta, paradas georreferenciadas, horarios de servicio, avisos de desvios por obras, reportes de demoras y gestion de preferencias de usuario.

## Stack Tecnologico

- Framework: React Native con Expo (SDK 57)
- Lenguaje: TypeScript
- Navegacion: Expo Router (basada en estructura de archivos)
- Estilos: StyleSheet de React Native
- Persistencia local y almacenamiento seguro: expo-sqlite, expo-secure-store
- APIs de dispositivo: expo-location, expo-camera, expo-sensors, expo-notifications, expo-file-system, expo-video

## Division de Tareas del Equipo

El desarrollo del proyecto se estructura en cinco modulos independientes y desacoplados:

### 1. Roberto - Modulo: Lineas, Recorridos y Avisos Multimedia
- Pantallas asignadas:
  - Listado de lineas urbanas con identificacion de color y estado.
  - Ficha de detalle de linea con seleccion de sentido (Ida y Vuelta).
  - Seccion de avisos y desvios vigentes por obras.
- Componentes y logica:
  - Trazado de recorridos en mapa mediante polilineas (react-native-maps).
  - Reproductor de video para visualizacion de desvios de transito (expo-video).
  - Servicio de consulta de lineas y alertas.

### 2. Nahuel - Modulo: Paradas Inteligentes, Geolocalizacion, Brujula y Escaner QR
- Pantallas asignadas:
  - Mapa interactivo de paradas cercanas a la posicion del usuario y buscador por nombre o calle.
  - Ficha de detalle de parada con lineas asociadas y enlace a navegacion a pie.
  - Escaner de camara para lectura de codigos QR de postes de parada.
- Componentes y logica:
  - Geolocalizacion en primer plano con seguimiento de posicion (expo-location).
  - Componente de aguja orientadora a pie utilizando el sensor magnetico del dispositivo (expo-sensors).
  - Lector de codigos QR mediante camara con control de rebote (expo-camera).
  - Servicio asincrono de paradas con calculo de distancias esfericas y rumbos geograficos.

### 3. Esteban - Modulo: Motor de Horarios, Calculo de Arribos y Persistencia SQLite
- Pantallas asignadas:
  - Grilla de frecuencias y horarios completos segmentada por tipo de dia (habiles, sabados, domingos y feriados).
  - Widget de proximos arribos en parada por linea.
- Componentes y logica:
  - Algoritmo de estimacion de proximas llegadas segun tabla horaria y reloj del dispositivo.
  - Base de datos relacional local para funcionamiento sin conexion (expo-sqlite).
  - Deteccion del estado de red y visualizacion de datos cacheados (expo-network).

### 4. Lucia - Modulo: Reportes Comunitarios de Demoras, Camara y Sistema de Archivos
- Pantallas asignadas:
  - Formulario modal de reporte de demoras por linea y parada.
  - Listado de incidencias activas en parada con confirmaciones comunitarias.
- Componentes y logica:
  - Captura y seleccion de imagenes para adjuntar al reclamo (expo-camera, expo-image-picker).
  - Persistencia de archivos fotograficos en almacenamiento permanente del dispositivo (expo-file-system).
  - Cola local de sincronizacion diferida para subida de reportes sin senal.
  - Respuesta haptica de confirmacion (expo-haptics).

### 5. Martina - Modulo: Autenticacion, Seguridad Biometrica, Favoritos y Notificaciones
- Pantallas asignadas:
  - Formularios de inicio de sesion y registro de usuario.
  - Pantalla de perfil, gestion de lineas/paradas favoritas y preferencias de tema (claro/oscuro).
  - Acceso directo a paradas y lineas favoritas en portada.
- Componentes y logica:
  - Almacenamiento seguro de credenciales y tokens de sesion (expo-secure-store).
  - Validacion de identidad biometrica por huella o rostro (expo-local-authentication).
  - Programacion de notificaciones locales de recordatorio de servicio (expo-notifications).
  - Almacenamiento clave-valor de preferencias (kv-store).

## Requisitos de Instalacion y Ejecucion

### Requisitos previos
- Node.js (version 20 LTS o superior recomendada).
- Git.
- Dispositivo movil con la aplicacion Expo Go instalada (Android o iOS) o emulador de Android configurado.

### Pasos para iniciar el proyecto

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/robertocolman/transporte---desarrollo-movil.git
   cd transporte---desarrollo-movil
   ```

2. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo de Expo (Metro):
   ```bash
   npx expo start
   ```

4. Ejecutar la aplicacion:
   - En un dispositivo fisico: Escanear el codigo QR generado en la terminal desde la app Expo Go.
   - En el emulador de Android: Presionar la tecla `a` en la terminal una vez iniciado el servidor.
   - En la version web: Presionar la tecla `w`.
