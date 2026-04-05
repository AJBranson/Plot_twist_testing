# Metanet Developer Integration Guide

Welcome, developer! This guide explains how to integrate your
application with the Metanet.page platform.

## Overview

-   Apps run inside a secure iframe
-   Communication via window.postMessage
-   No alerts/prompts --- everything uses messaging
-   Language-agnostic (JS, React, Vue, etc.)
-   Optional lightweight JS SDK available

------------------------------------------------------------------------

# Core Messaging Protocol

## Sending Messages

``` js
window.parent.postMessage({
  command: "ninja-app-command",
  detail: {
    type: "connection"
  }
}, "*");
```

## Receiving Messages

``` js
window.addEventListener("message", (event) => {
  const { command, type, payload } = event.data;

  if (command === "ninja-app-command") {
    if (type === "connection-response") {}
    if (type === "pay-response") {}
  }
});
```

------------------------------------------------------------------------

# JavaScript SDK

``` html
<script type="module">
const eventTarget = new EventTarget();

const sendCommand = (commandObj) => {
  window.parent.postMessage({
    command: "ninja-app-command",
    detail: commandObj
  }, "*");

  eventTarget.dispatchEvent(new CustomEvent('platform-command', {
    detail: commandObj
  }));
};

const onCommand = (callback) => {
  window.addEventListener('message', (event) => {
    if (event.data?.command === "ninja-app-command") {
      callback(event.data);
    }
  });
};

window.platformSDK = { sendCommand, onCommand };
</script>
```

------------------------------------------------------------------------

# Typical Integration Flow

1.  Connection → connection-response\
2.  Action (pay) → pay-response\
3.  Create post → create-post-response

------------------------------------------------------------------------

# Connection Example

``` json
{
  "type": "connection"
}
```

------------------------------------------------------------------------

# Payment Example (BSV)

``` json
{
  "type": "pay",
  "ref": "unique_reference",
  "recipients": [
    { "reason": "AI_IMG" },
    {
      "address": "target_address",
      "value": 330000
    }
  ]
}
```

------------------------------------------------------------------------

# Create Post Example

``` json
{
  "type": "create-post",
  "params": {
    "headline": "text",
    "nftDescription": "text"
  }
}
```

------------------------------------------------------------------------

# Utilities

## Open Link

``` json
{
  "type": "open-link",
  "url": "https://example.com"
}
```

## QR Scan

``` json
{
  "type": "qr-scan",
  "ref": "id"
}
```

## Clipboard

``` json
{
  "type": "write-clipboard",
  "text": "string"
}
```

------------------------------------------------------------------------

# Transactions

``` json
{
  "type": "full-transaction",
  "txid": "id"
}
```

------------------------------------------------------------------------

# Token History

``` json
{
  "type": "token-history",
  "offset": 0,
  "limit": 100
}
```

------------------------------------------------------------------------

# End of Document
