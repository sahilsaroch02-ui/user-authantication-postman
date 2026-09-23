const db = require("./db");

const initDb = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('user', 'buyer', 'seller', 'admin') NOT NULL DEFAULT 'user',
      reset_otp VARCHAR(6),
      reset_otp_expiry DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(sql, (err) => {
    if (err) {
      const reason = err.message || err.code || "Unknown database error";
      console.error("Database initialization failed:", reason);
      return;
    }

    const alterQueries = [
      "ALTER TABLE users ADD COLUMN role ENUM('user', 'buyer', 'seller', 'admin') NOT NULL DEFAULT 'user'",
      "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'buyer', 'seller', 'admin') NOT NULL DEFAULT 'user'",
      "ALTER TABLE users ADD COLUMN reset_otp VARCHAR(6)",
      "ALTER TABLE users ADD COLUMN reset_otp_expiry DATETIME",
    ];

    let pending = alterQueries.length;

    alterQueries.forEach((alterSql) => {
      db.query(alterSql, (alterErr) => {
        if (alterErr && alterErr.code !== "ER_DUP_FIELDNAME") {
          console.error(
            "Database migration failed:",
            alterErr.message || alterErr.code,
          );
        }

        pending -= 1;

        if (pending === 0) {
          const productsSql = `
            CREATE TABLE IF NOT EXISTS products (
              id INT AUTO_INCREMENT PRIMARY KEY,
              seller_id INT NOT NULL,
              name VARCHAR(150) NOT NULL,
              description TEXT,
              price DECIMAL(10, 2) NOT NULL,
              quantity INT NOT NULL DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `;

          db.query(productsSql, (productErr) => {
            if (productErr) {
              console.error(
                "Product table initialization failed:",
                productErr.message || productErr.code,
              );
              return;
            }

            const ordersSql = `
              CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                buyer_id INT NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
              )
            `;

            db.query(ordersSql, (orderErr) => {
              if (orderErr) {
                console.error(
                  "Order table initialization failed:",
                  orderErr.message || orderErr.code,
                );
                return;
              }

              const orderItemsSql = `
                CREATE TABLE IF NOT EXISTS order_items (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  order_id INT NOT NULL,
                  product_id INT NOT NULL,
                  seller_id INT NOT NULL,
                  quantity INT NOT NULL,
                  price DECIMAL(10, 2) NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
                )
              `;

              db.query(orderItemsSql, (itemErr) => {
                if (itemErr) {
                  console.error(
                    "Order item table initialization failed:",
                    itemErr.message || itemErr.code,
                  );
                  return;
                }

                console.log("Database is ready");
              });
            });
          });
        }
      });
    });
  });
};

module.exports = initDb;
