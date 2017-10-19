curl --user guest:guest ftp://forge-idi.ign.fr/iTowns/examples/Li3ds/images_091117.tgz --remote-name
tar -xzvf images_091117.tgz

curl --user guest:guest ftp://forge-idi.ign.fr/iTowns/examples/Li3ds/li3ds.ply --remote-name

curl --user guest:guest ftp://forge-idi.ign.fr/iTowns/examples/Li3ds/demo.tgz --remote-name
tar -xzvf demo.tgz

mv demo/cloud.js demo/cloud.json

curl --user guest:guest ftp://forge-idi.ign.fr/iTowns/examples/Li3ds/Photo.tgz --remote-name

mv Photo/cloud.js Photo/cloud.json

tar -xzvf Photo.tgz
