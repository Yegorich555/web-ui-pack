let un = null;
global.setUnhandledReject = (fnOrNull) => {
  un = fnOrNull;
};

process.on("unhandledRejection", (err) => {
  if (un) {
    un(err);
  } else {
    console.error("UnhandledRejection\r\n", err);
  }
});
