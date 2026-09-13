FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY asset-service/target/asset-service-0.1.0-SNAPSHOT.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java","-jar","/app/app.jar"]
