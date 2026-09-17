FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY report-service/target/report-service-0.1.0-SNAPSHOT.jar app.jar
EXPOSE 8086
ENTRYPOINT ["java","-jar","/app/app.jar"]
