const https = require("https");
const http = require("http");
const express = require("express");
const rateLimit = require("express-rate-limit");
const winston = require("winston");
const fs = require("fs");



const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});


const logRequest = (req, res, next) => {
  logger.info({
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    message: "Incoming request",
  });
  next();
};


const logError = (e, req, res, next) => {
  logger.error({
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    message: "Error",
    error: e.message,
  });
  next(e);
};


const logWarn = (req, res, msg) => {
    logger.warn({
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      message: msg,
    });
};



const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 50,
  message:
    "You have exceeded rate limit, too many requests from this IP, please try again later...",
  handler: (req, res) => {
    logWarn(req, res, "Rate limit exceeded");

    res.status(429).send("You have exceeded rate limit, too many requests from this IP, please try again later...");
  },
});


const app = express();

app.use(logRequest);
app.use(logError);
//app.use(logWarn)
app.use(limiter);
app.use(express.static("public"));


const options = {
  key: fs.readFileSync("private.key"),
  cert: fs.readFileSync("certificate.crt"),
};


const port = 443;
const httpPort = 80;

const server = https.createServer(options, app);

server.listen(port, () => {
  console.log(`HTTPS server listening on port ${port}`);
});


const httpServer = http.createServer((req, res) => {
  const httpsUrl = `https://${req.headers.host}${req.url}`;
  res.writeHead(301, { Location: httpsUrl });
  res.end();
});

httpServer.listen(httpPort, () => {
  console.log(`HTTP server listening on port ${httpPort}`);
});

