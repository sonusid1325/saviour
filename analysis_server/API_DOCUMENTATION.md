# Analysis Server API Documentation

Base URL: `http://localhost:2222`

## Endpoints

### 1. Get Blockchain Stats
Returns general statistics about the blockchain and IP tokens.

- **URL:** `/api/stats`
- **Method:** `GET`
- **Success Response:**
  - **Code:** 200
  - **Content:**
    ```json
    {
      "total_tokens": 150,
      "malicious_count": 12,
      "clean_count": 130,
      "suspicious_count": 8,
      "latest_block": 12345,
      "total_transactions": 0
    }
    ```

### 2. Get All IP Tokens
Returns a list of all IP tokens tracked on the blockchain.

- **URL:** `/api/tokens`
- **Method:** `GET`
- **Query Params:**
  - `limit` (optional): Number of tokens to return (default: 100)
- **Success Response:**
  - **Code:** 200
  - **Content:** `[ ...list of token objects... ]`

### 3. Get Malicious IPs
Returns a list of all IPs flagged as malicious.

- **URL:** `/api/malicious-ips`
- **Method:** `GET`
- **Success Response:**
  - **Code:** 200
  - **Content:** `[ ...list of token objects... ]`

### 4. Get Recent Transactions
Returns a list of recent blockchain transactions related to IP tokens.

- **URL:** `/api/transactions`
- **Method:** `GET`
- **Query Params:**
  - `limit` (optional): Number of transactions to return (default: 10)
- **Success Response:**
  - **Code:** 200
  - **Content:**
    ```json
    [
      {
        "hash": "0x123...",
        "blockNumber": 12340,
        "timestamp": 1630000000000,
        "type": "Transaction",
        "from": "5Grw...",
        "status": "success",
        "method": "ipToken.mintIpToken"
      }
    ]
    ```

### 5. Get IP Token Details
Returns details for a specific IP address.

- **URL:** `/api/ip/:ip`
- **Method:** `GET`
- **URL Params:**
  - `ip`: The IP address (e.g., `192.168.1.1`)
- **Success Response:**
  - **Code:** 200
  - **Content:**
    ```json
    {
      "ipAddress": "192.168.1.1",
      "tokenId": 1,
      "threatLevel": "clean",
      "confidenceScore": 95,
      "isMalicious": false,
      ...
    }
    ```
- **Error Response:**
  - **Code:** 404
  - **Content:** `{ "error": "IP token not found" }`

### 6. Check Whitelist Status
Checks if an IP address is whitelisted.

- **URL:** `/api/whitelist/:ip`
- **Method:** `GET`
- **URL Params:**
  - `ip`: The IP address
- **Success Response:**
  - **Code:** 200
  - **Content:**
    ```json
    {
      "ip": "192.168.1.1",
      "isWhitelisted": true
    }
    ```
