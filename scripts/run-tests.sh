#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Running save/load tests..."
node --experimental-vm-modules tests/save_load.test.js

echo "Running marketplace/merchant tests..."
node --experimental-vm-modules tests/marketplace_merchant.test.js

echo "All tests completed successfully."