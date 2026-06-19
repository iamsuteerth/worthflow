#!/bin/bash
awslocal s3 mb s3://worth-flow-saves
awslocal s3api put-bucket-cors --bucket worth-flow-saves --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "DELETE"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": []
  }]
}'
