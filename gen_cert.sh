#!/bin/bash

#
# Generate self signed certificate/key for SSL
#

echo "================================================================"
echo "NOTE!!! You MUST set Common Name = hostname you will connect to!"
echo "else TLS will refuse to connect with Error: socket hang up"
echo "e.g. for local testing that would be localhost"
echo "================================================================"
echo

sleep 1

NAME=example
KEYNAME=$NAME-key.pem
CSRNAME=$NAME-csr.pem
CERTNAME=$NAME-cert.pem

openssl genrsa -out $KEYNAME 1024
openssl req -new -key $KEYNAME -out $CSRNAME
openssl x509 -req -days 10000 -in $CSRNAME -signkey $KEYNAME -out $CERTNAME
