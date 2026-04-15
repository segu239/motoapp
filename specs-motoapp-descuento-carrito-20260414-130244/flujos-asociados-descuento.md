# Flujos asociados a la operacion con descuento

Este documento aclara que flujos quedan contemplados por la propuesta de descuento global en carrito y cuales no.

## 1. Venta principal

- El operador arma items en carrito.
- El carrito calcula `subtotal_bruto`.
- Se aplica `bonifica` global porcentual.
- Se obtiene `total_neto`.
- Se persiste cabecera en `factcabX` con `bonifica`, `bonifica_tipo`, `basico`, `iva1`, `saldo`.

```mermaid
flowchart TD
    A[Operador arma carrito] --> B[Items en sessionStorage / estado local]
    B --> C[Calculo subtotal bruto]
    C --> D[Aplicar descuento global %]
    D --> E[Calcular total neto]
    E --> F[Armar cabecera]
    F --> G[factcabX<br/>bonifica / bonifica_tipo / basico / iva1 / saldo]
    E --> H[Armar pedidos]
    H --> I[psucursalX<br/>detalle por item sin descuento por linea]
```

## 2. Caja y medios de pago

- La propuesta si contempla `caja_movi`.
- El descuento no queda como columna nueva en caja.
- El efecto del descuento se refleja en el importe neto de los movimientos.
- Si hay multiples medios de pago, el descuento debe prorratearse entre ellos.

```mermaid
flowchart LR
    A[Subtotal bruto] --> B[Descuento global]
    B --> C[Total neto]
    C --> D[Prorrateo por medios de pago]
    D --> E[Efectivo]
    D --> F[Tarjeta]
    D --> G[Cuenta corriente]
    E --> H[caja_movi]
    F --> H
    G --> H
```

## 3. Recibo automatico asociado

- La propuesta si contempla `recibosX`.
- El backend ya copia `bonifica` y `bonifica_tipo` al recibo automatico.
- Lo que cambia es que el recibo debe reflejar el mismo total neto que la cabecera.

```mermaid
sequenceDiagram
    participant C as Carrito
    participant B as Backend PHP
    participant F as factcabX
    participant R as recibosX

    C->>B: pedidos + cabecera + caja_movi
    B->>B: recalcula subtotal/descuento/neto
    B->>F: inserta cabecera con bonifica
    B->>R: genera recibo automatico
    B->>R: copia bonifica / bonifica_tipo
```

## 4. Comprobante emitido en el momento

- La propuesta si contempla el PDF inmediato.
- El comprobante debe mostrar al menos:
  - subtotal bruto
  - descuento global
  - total neto

```mermaid
flowchart TD
    A[Datos del carrito] --> B[Subtotal bruto]
    A --> C[Descuento global]
    B --> D[Total neto]
    C --> D
    D --> E[PDF inmediato]
    E --> F[Comprobante entregado al cliente]
```

## 5. Historial y reimpresion

- La propuesta si contempla historial y reimpresion.
- Este es uno de los puntos mas importantes.
- Hoy el historial recompone total desde items; la propuesta corrige eso.
- La fuente de verdad monetaria debe pasar a ser cabecera/recibo.

```mermaid
flowchart TD
    A[factcabX<br/>bonifica / neto] --> D[Historial PDF]
    B[recibosX<br/>bonifica / neto] --> D
    C[psucursalX<br/>items] --> D
    D --> E[Reimpresion consistente]

    style A fill:#dff0d8,stroke:#3c763d
    style B fill:#dff0d8,stroke:#3c763d
    style C fill:#f5f5f5,stroke:#666
```

## 6. Mapa completo de la operacion

```mermaid
flowchart TD
    A[Operador] --> B[Carrito Angular]
    B --> C[Calculo subtotal bruto]
    C --> D[Descuento global %]
    D --> E[Total neto canonico]
    E --> F[Cabecera]
    E --> G[Subtotales netos por medio]
    B --> H[Detalle items]

    F --> I[factcabX]
    H --> J[psucursalX]
    G --> K[caja_movi]

    I --> L[Recibo automatico]
    L --> M[recibosX]

    I --> N[PDF inmediato]
    J --> N
    M --> O[Historial / Reimpresion]
    I --> O
    J --> O
    K --> P[Control de caja]
```

## 7. Que flujos SI quedan contemplados

- Venta principal en `factcabX`.
- Detalle de articulos en `psucursalX`.
- Caja en `caja_movi`.
- Recibo automatico en `recibosX`.
- PDF emitido desde carrito.
- Historial y reimpresion.
- Cuenta corriente, pero solo si el saldo se recalcula sobre el neto y no sobre el bruto.

## 8. Que NO queda cubierto automaticamente

- Reportes externos no revisados que lean solo `psucursalX` y sumen `precio * cantidad`.
- Analiticas o exportaciones legacy que no tomen `bonifica` desde cabecera/recibo.
- Un descuento persistido por linea de item.
- Escenarios futuros de descuento por importe fijo si se decide dejar fase 1 solo en porcentaje.

## 9. Decision clave

La propuesta contempla los flujos operativos asociados a la venta, pero bajo una condicion: el sistema debe dejar de tomar como verdad absoluta la suma de items y pasar a usar un **total neto canonico** compartido por comprobante, recibo, caja e historial.
