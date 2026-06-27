Technical Challenge · Software Engineer 

## KYB para Agencia Aduanal 

Construye una plataforma desplegada que determine si una persona moral es segura, requiere revisión o es riesgosa para operar comercio exterior. 


## El Problema 

Una agencia aduanal debe decidir si puede trabajar con una persona moral antes de operar comercio exterior en su nombre. 

La Regla 1.4.14 de las RGCE exige integrar un expediente electrónico por cliente. Pero tener documentos no basta: la agencia necesita saber si el cliente es seguro, requiere revisión o es riesgoso. 

Tu misión es construir esa plataforma. 


## CHALLENGE 

Construye y despliega una web app que permita correr un KYB real para una persona moral mexicana. 

El sistema debe: 

1. Crear un expediente KYB. 

2. Cargar documentos o registrar metadata auditable. 

3. Validar documentos, vigencias y datos obligatorios. 

4. Consultar listas fiscales públicas del SAT. 

5. Conciliar datos entre documentos. 

6. Calcular un score de riesgo explicable. 

7. Decidir si el cliente es `safe` , `review_required` o `high_risk` . 

8. Bloquear aprobación cuando exista riesgo crítico. 

9. Registrar evidencia y audit log. 


## Requisitos Funcionales 

### Expediente 

Debe incluir, como mínimo: 

- Acta constitutiva o instrumento notarial. 

- Identificación del representante legal. 

- Poder o evidencia de representación, cuando aplique. 

- Comprobante de domicilio. 

- RFC. 

- Constancia de situación fiscal. 

- Manifestación bajo protesta. 

- Socios, accionistas o beneficiario controlador cuando exista evidencia documental. 

### Score de Riesgo 

Este es el punto más importante de la prueba. 

El score debe ser determinístico, explicable y testeable. No basta mostrar un número; debe explicar qué factores subieron o bajaron el riesgo. 

Factores mínimos: 

- Resultado en listas fiscales públicas. 

- Documentos faltantes. 

- Documentos vencidos. 

- CSF fuera del mes vigente. 

- Discrepancias entre documentos. 

- Revisión de listas fiscales con más de 3 meses. 

- Completitud de representante legal, socios/accionistas o beneficiario controlador. 

Clasificación requerida: 

- `safe` : cliente operable. 

- `review_required` : requiere revisión humana o aprobación manual. 

- `high_risk` : no puede aprobarse. 

### Conciliación de Datos 

El sistema debe comparar datos entre documentos y marcar discrepancias materiales. 

Ejemplos: 

- RFC y razón social entre CSF, acta y formulario. 

- Representante legal entre poder, identificación y formulario. 

- Domicilio entre CSF, comprobante y formulario. 

- Fechas de emisión, vigencia o vencimiento. 

### Listas Fiscales 

Usa datos reales y públicos del SAT. No uses mocks para listas fiscales. 

Como mínimo: 

Artículo 69 CFF, excepto fracción VI cuando aplique. 

- Artículo 69-B CFF. 

- Artículo 69-B Bis CFF. 

- Artículo 49 Bis CFF, con la fuente pública disponible que puedas justificar. 

Cada revisión debe guardar fuente, fecha/hora, RFC buscado, resultado y referencia al listado usado. 

### Vigencias 

- El expediente debe pasar a `needs_update` cuando: 

   - Cualquier documento vence. 

   - La CSF no es del mes vigente. 

   - La revisión de listas fiscales tiene más de 3 meses. 

   - El cliente reporta cambios. 

## Ejemplo 

Un cliente puede tener: 

   - CSF del mes vigente. 

   - Acta constitutiva cargada. 

   - Representante legal capturado. 

   - Sin coincidencias en listas fiscales. 

   - Comprobante de domicilio vencido. 

   - Razón social distinta entre formulario y CSF. 

- Un buen sistema no solo dice "faltan datos". Debe producir una decisión como: 

```
review_required
```

Y explicar: 

- +20 riesgo por comprobante vencido. 

- +30 riesgo por discrepancia de razón social. 

- 0 riesgo por listas fiscales limpias. 

- Acción sugerida: corregir razón social y actualizar comprobante antes de aprobar. 

## Fuentes 

- Regla 1.4.14 RGCE 2026: https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/rgce/1raRMRGCEpara2026.pdf 

- Datos abiertos SAT: https://www.sat.gob.mx/minisitio/DatosAbiertos/contribuyentes_publicados.html 

- Contribuyentes incumplidos: https://wwwmat.sat.gob.mx/consultas/11981/consulta-la-relacion-decontribuyentes-incumplidos 

- Operaciones presuntamente inexistentes: https://wwwmat.sat.gob.mx/consultas/76674/consulta-la-relacionde-contribuyentes-con-operaciones-presuntamente-inexistentes 

- Portal SAT PLD: https://sppld.sat.gob.mx/pld/interiores/obligaciones.html 


## Entrega y Despliegue 

Tienes 48 horas naturales. 

Entrega: 

1. URL pública de la plataforma desplegada. 

2. Repositorio público en GitHub. 

Plataformas sugeridas: Vercel, Netlify, Render, Railway, Fly.io o equivalente. 

