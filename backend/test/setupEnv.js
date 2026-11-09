'use strict';

// Se ejecuta antes de cargar cada archivo de pruebas.
// El límite alto evita que las pruebas se acoplen entre sí a través del
// contador del rate limiter de la app compartida (ver docs/15). La prueba de
// rate limit crea su propia instancia con un límite bajo.
process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_MAX = process.env.AUTH_RATE_MAX || '10000';
