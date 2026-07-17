module.exports = {
  apps: [{
    name: "seum-backend",
    script: "./dist/index.js",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 4000,
    },
    env_file: ".env",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    combine_logs: true,
    time: true,
  }],
};
