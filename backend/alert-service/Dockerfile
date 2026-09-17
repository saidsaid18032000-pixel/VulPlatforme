FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY alert-service/target/alert-service-0.1.0-SNAPSHOT.jar app.jar
EXPOSE 8085
ENTRYPOINT ["java","-jar","/app/app.jar"]
