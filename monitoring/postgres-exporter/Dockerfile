FROM quay.io/prometheuscommunity/postgres-exporter:latest
COPY --chmod=755 docker-entrypoint.sh /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]