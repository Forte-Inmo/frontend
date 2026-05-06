#!/bin/bash

# Configuration
DATABASE_ID="informes"
COLLECTION_ID="field_locks"

echo "Creating collection $COLLECTION_ID in database $DATABASE_ID..."

# 1. Create Collection with broad permissions for testing (Any can create/read/delete)
appwrite databases create-collection \
  --database-id "$DATABASE_ID" \
  --collection-id "$COLLECTION_ID" \
  --name "Field Locks" \
  --permissions 'create("any")' 'read("any")' 'delete("any")' \
  --document-security false

echo "Creating attributes..."

# 2. Create Attributes
appwrite databases create-string-attribute \
  --database-id "$DATABASE_ID" \
  --collection-id "$COLLECTION_ID" \
  --key "informe_id" \
  --size 36 \
  --required true

appwrite databases create-string-attribute \
  --database-id "$DATABASE_ID" \
  --collection-id "$COLLECTION_ID" \
  --key "field_path" \
  --size 128 \
  --required true

appwrite databases create-string-attribute \
  --database-id "$DATABASE_ID" \
  --collection-id "$COLLECTION_ID" \
  --key "user_id" \
  --size 36 \
  --required true

appwrite databases create-string-attribute \
  --database-id "$DATABASE_ID" \
  --collection-id "$COLLECTION_ID" \
  --key "user_name" \
  --size 128 \
  --required true

appwrite databases create-integer-attribute \
  --database-id "$DATABASE_ID" \
  --collection-id "$COLLECTION_ID" \
  --key "timestamp" \
  --required true

# Wait a bit for attributes to be processed (Appwrite needs a moment)
echo "Waiting for attributes to be ready..."
sleep 5

echo "Creating index..."

# 3. Create Index
appwrite databases create-index \
  --database-id "$DATABASE_ID" \
  --collection-id "$COLLECTION_ID" \
  --key "index_informe" \
  --type "key" \
  --attributes "informe_id"

echo "Done! Check your Appwrite Console to confirm."
