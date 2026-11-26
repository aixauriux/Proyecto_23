
const formulario = document.querySelector('#formulario');
const ciudad = document.querySelector('#ciudad');
const mensaje = document.querySelector('#mensaje');
const resultado = document.querySelector('#resultado');

const botonActualizar = document.querySelector('#actualizar');
const botonUbicacion = document.querySelector('#ubicacion');

let ultimaUbicacion = '';
let zonaHoraria = 'UTC';

// Iconos del clima
const iconos = {
    'clear-day': '☀️',
    'clear-night': '🌙',
    'partly-cloudy-day': '🌤️',
    'partly-cloudy-night': '☁️',
    'cloudy': '☁️',
    'rain': '🌧️',
    'showers-day': '🌦️',
    'showers-night': '🌧️',
    'snow': '❄️',
    'thunder-rain': '⛈️',
    'thunder-showers-day': '⛈️',
    'fog': '🌫️',
    'wind': '💨'
};

// Seleccionar icono
function simbolo(codigo) {
    return iconos[codigo] || '🌤️';
}

// Mostrar números
function numero(valor, unidad) {
    if (valor == null) {
        return 'Sin datos';
    }

    return `${Math.round(valor)} ${unidad}`;
}

// Cambiar textos del HTML
function texto(selector, valor) {
    document.querySelector(selector).textContent = valor;
}

// Mostrar las tarjetas de las horas
function mostrarHoras(selector, horas) {

    const contenedor = document.querySelector(selector);
    contenedor.replaceChildren();

    if (horas.length === 0) {
        contenedor.textContent = 'No hay datos disponibles.';
        return;
    }

    horas.forEach(hora => {

        const tarjeta = document.createElement('article');
        tarjeta.className = 'hora';

        const fecha = new Date(hora.datetimeEpoch * 1000);

        const etiqueta = fecha.toLocaleString('es-CO', {
            timeZone: zonaHoraria,
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        const titulo = document.createElement('small');
        titulo.textContent = etiqueta;

        const dibujo = document.createElement('p');
        dibujo.className = 'simbolo';
        dibujo.textContent = simbolo(hora.icon);

        const temperatura = document.createElement('strong');
        temperatura.textContent = numero(hora.temp, '°C');

        const lluvia = document.createElement('small');
        lluvia.textContent = `🌧️ ${numero(hora.precipprob, '%')}`;

        tarjeta.append(titulo, dibujo, temperatura, lluvia);
        contenedor.append(tarjeta);

    });
}

// Consultar el clima
async function consultar(ubicacion) {

    if (!ubicacion.trim()) {
        mensaje.textContent = 'Escribe una ubicación.';
        return;
    }

    mensaje.textContent = 'Consultando el clima... ⏳';
    resultado.hidden = true;

    document.querySelectorAll('button').forEach(boton => {
        boton.disabled = true;
    });

    try {

        // Fechas para consultar el pronóstico
        const inicio = new Date(Date.now() - 86400000)
            .toISOString().slice(0, 10);

        const fin = new Date(Date.now() + 2 * 86400000)
            .toISOString().slice(0, 10);

        // API de Visual Crossing
        const ruta =
            `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(ubicacion)}/${inicio}/${fin}`;

        const respuesta = await fetch(
            `${ruta}?unitGroup=metric&include=days,hours,current&contentType=json&lang=es`
        );

        if (!respuesta.ok) {
            throw new Error(
                `No se pudo consultar la ubicación (HTTP ${respuesta.status}).`
            );
        }

        const datos = await respuesta.json();

        if (!datos.days?.length) {
            throw new Error('No se encontraron datos meteorológicos.');
        }

        zonaHoraria = datos.timezone || 'UTC';

        const actual = datos.currentConditions || datos.days[0];

        const ahora = datos.currentConditions?.datetimeEpoch
            || Math.floor(Date.now() / 1000);

        const horas = datos.days.flatMap(dia => dia.hours || []);

        // Últimas 24 horas
        const anteriores = horas.filter(hora =>
            hora.datetimeEpoch < ahora &&
            hora.datetimeEpoch >= ahora - 86400
        ).slice(-24);

        // Próximas 24 horas
        const siguientes = horas.filter(hora =>
            hora.datetimeEpoch >= ahora &&
            hora.datetimeEpoch < ahora + 86400
        ).slice(0, 24);

        // Mostrar información actual
        texto('#lugar', datos.resolvedAddress || ubicacion);
        texto('#temperatura', numero(actual.temp, '°C'));
        texto('#condicion', actual.conditions || 'Sin datos');
        texto('#icono', simbolo(actual.icon));

        texto('#viento', numero(actual.windspeed, 'km/h'));
        texto('#lluvia', numero(actual.precipprob, '%'));
        texto('#humedad', numero(actual.humidity, '%'));
        texto('#sensacion', numero(actual.feelslike, '°C'));

        // Mostrar pronósticos
        mostrarHoras('#pasado', anteriores);
        mostrarHoras('#futuro', siguientes);

        resultado.hidden = false;

        mensaje.textContent = 'Clima actualizado correctamente.';

        ultimaUbicacion = ubicacion;

    } catch (error) {

        mensaje.textContent =
            `${error.message} Comprueba la ciudad o intenta más tarde.`;

    } finally {

        document.querySelectorAll('button').forEach(boton => {
            boton.disabled = false;
        });

    }
}

// Botón buscar
formulario.addEventListener('submit', evento => {

    evento.preventDefault();
    consultar(ciudad.value);

});

// Botón actualizar
botonActualizar.addEventListener('click', () => {

    consultar(ultimaUbicacion || ciudad.value);

});

// Botón de ubicación actual
botonUbicacion.addEventListener('click', () => {

    if (!navigator.geolocation) {
        mensaje.textContent =
            'Tu navegador no permite obtener la ubicación.';
        return;
    }

    mensaje.textContent = 'Solicitando permiso de ubicación...';

    navigator.geolocation.getCurrentPosition(

        posicion => {

            const coordenadas =
                `${posicion.coords.latitude},${posicion.coords.longitude}`;

            ciudad.value = coordenadas;
            consultar(coordenadas);

        },

        () => {
            mensaje.textContent =
                'No se pudo obtener la ubicación. Puedes escribir tu ciudad.';
        }

    );

});
