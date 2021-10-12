# ITMD545WebRTC-Project1
Project 1 for ITMD WebRTC, Fall 2021

# Generate SSL Certs
* `cd` into `~/Certs` first *

```
openssl req -x509 -out localhost.crt -keyout localhost.key \ -newkey rsa:2048 -nodes -sha256 -days 1825 \ -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```