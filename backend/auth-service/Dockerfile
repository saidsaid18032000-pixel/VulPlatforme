FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY auth-service/target/auth-service-0.1.0-SNAPSHOT.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java","-jar","/app/app.jar"]
