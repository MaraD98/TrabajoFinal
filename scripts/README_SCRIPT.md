-- Comandos para base 
docker cp db/init/01_init.sql sqlserver:/tmp/01_init.sql
docker exec -it sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P contraseñanuestra -i /tmp/01_init.sql
