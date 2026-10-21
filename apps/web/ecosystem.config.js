module.exports = {
  apps: [{
    name: "seum-frontend",
    script: "npm",
    args: "start",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    env_file: ".env",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    combine_logs: true,
    time: true,
  }],
};
