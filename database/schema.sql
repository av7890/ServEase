CREATE DATABASE IF NOT EXISTS serveease;
USE serveease;

DROP TABLE IF EXISTS REVIEW;
DROP TABLE IF EXISTS PAYMENT;
DROP TABLE IF EXISTS BOOKING;
DROP TABLE IF EXISTS AVAILABILITY_SLOT;
DROP TABLE IF EXISTS PROVIDER_SKILL;
DROP TABLE IF EXISTS SERVICE;
DROP TABLE IF EXISTS SERVICE_PROVIDER;
DROP TABLE IF EXISTS SKILL;
DROP TABLE IF EXISTS SERVICE_CATEGORY;
DROP TABLE IF EXISTS LOCATION;
DROP TABLE IF EXISTS ADMIN;
DROP TABLE IF EXISTS CUSTOMER;

CREATE TABLE CUSTOMER (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    password VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ADMIN (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE LOCATION (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    area VARCHAR(150) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    UNIQUE KEY uq_location (city, area, pincode)
);

CREATE TABLE SERVICE_CATEGORY (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE SKILL (
    skill_id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE SERVICE_PROVIDER (
    provider_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    password VARCHAR(255) NOT NULL,
    experience_years INT NOT NULL DEFAULT 0,
    status ENUM('pending','approved','suspended') NOT NULL DEFAULT 'pending',
    bio TEXT,
    location_id INT,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_provider_location FOREIGN KEY (location_id) REFERENCES LOCATION(location_id) ON DELETE SET NULL,
    CONSTRAINT fk_provider_admin FOREIGN KEY (approved_by) REFERENCES ADMIN(admin_id) ON DELETE SET NULL
);

CREATE TABLE SERVICE (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    provider_id INT NOT NULL,
    category_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_provider FOREIGN KEY (provider_id) REFERENCES SERVICE_PROVIDER(provider_id) ON DELETE CASCADE,
    CONSTRAINT fk_service_category FOREIGN KEY (category_id) REFERENCES SERVICE_CATEGORY(category_id) ON DELETE RESTRICT
);

CREATE TABLE PROVIDER_SKILL (
    provider_id INT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (provider_id, skill_id),
    CONSTRAINT fk_provider_skill_provider FOREIGN KEY (provider_id) REFERENCES SERVICE_PROVIDER(provider_id) ON DELETE CASCADE,
    CONSTRAINT fk_provider_skill_skill FOREIGN KEY (skill_id) REFERENCES SKILL(skill_id) ON DELETE CASCADE
);

CREATE TABLE AVAILABILITY_SLOT (
    provider_id INT NOT NULL,
    slot_id INT NOT NULL,
    service_id INT NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    PRIMARY KEY (provider_id, slot_id),
    CONSTRAINT fk_slot_provider FOREIGN KEY (provider_id) REFERENCES SERVICE_PROVIDER(provider_id) ON DELETE CASCADE,
    CONSTRAINT fk_slot_service FOREIGN KEY (service_id) REFERENCES SERVICE(service_id) ON DELETE CASCADE,
    CONSTRAINT chk_slot_times CHECK (end_time > start_time)
);

CREATE TABLE BOOKING (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_date DATE NOT NULL,
    scheduled_time DATETIME NOT NULL,
    status ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
    notes TEXT,
    customer_id INT NOT NULL,
    service_id INT NOT NULL,
    provider_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_customer FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_service FOREIGN KEY (service_id) REFERENCES SERVICE(service_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_provider FOREIGN KEY (provider_id) REFERENCES SERVICE_PROVIDER(provider_id) ON DELETE RESTRICT
);

CREATE TABLE PAYMENT (
    booking_id INT NOT NULL,
    payment_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    method ENUM('cash','card','upi') NOT NULL,
    payment_status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
    payment_date DATE NOT NULL,
    PRIMARY KEY (booking_id, payment_id),
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES BOOKING(booking_id) ON DELETE CASCADE
);

CREATE TABLE REVIEW (
    booking_id INT NOT NULL,
    review_id INT NOT NULL,
    rating TINYINT NOT NULL,
    comment TEXT,
    PRIMARY KEY (booking_id, review_id),
    CONSTRAINT fk_review_booking FOREIGN KEY (booking_id) REFERENCES BOOKING(booking_id) ON DELETE CASCADE,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
);

INSERT INTO LOCATION (location_id, city, area, pincode) VALUES
    (1, 'Mumbai', 'Andheri West', '400053'),
    (2, 'Mumbai', 'Bandra West', '400050'),
    (3, 'Delhi', 'Lajpat Nagar', '110024'),
    (4, 'Delhi', 'Dwarka', '110075'),
    (5, 'Pune', 'Koregaon Park', '411001');

INSERT INTO SERVICE_CATEGORY (category_id, category_name, description) VALUES
    (1, 'Plumbing', 'Pipe repairs, leak fixes, and water system services'),
    (2, 'Electrical', 'Wiring, switchboard, and appliance support'),
    (3, 'Cleaning', 'Deep cleaning for homes and apartments'),
    (4, 'Carpentry', 'Furniture assembly and repair work'),
    (5, 'Painting', 'Interior wall preparation and paint application');

INSERT INTO SKILL (skill_id, skill_name, description) VALUES
    (1, 'Pipe Fitting', 'Install and repair water pipes'),
    (2, 'Leak Repair', 'Resolve leakage and seal failures'),
    (3, 'Circuit Work', 'Repair and install electrical circuits'),
    (4, 'Appliance Service', 'Troubleshoot home appliances'),
    (5, 'Deep Cleaning', 'Whole-home cleaning service'),
    (6, 'Sofa Cleaning', 'Fabric and upholstery cleaning'),
    (7, 'Furniture Assembly', 'Assemble and repair furniture'),
    (8, 'Wall Painting', 'Prepare and paint interior walls');

INSERT INTO ADMIN (admin_id, username, password, email) VALUES
    (1, 'superadmin', 'pbkdf2$120000$adminsalt0011223344$8eb88019dddd751d53384e5efd89ca3f7647dd3302435328f658e92e6c54f4cb12de2bd7b175be6564778132ec1f2c492f7ccfce324c43eb02dd5e9e8010d6dc', 'admin@serveease.com');

INSERT INTO CUSTOMER (customer_id, name, email, phone, password, address) VALUES
    (1, 'Priya Sharma', 'priya@example.com', '9876543210', 'pbkdf2$120000$custsalt0011223344$d4de8bd5d9f622120f961b861c0d40e75d3c7aa48055bf6b27353ac2e0d9545acbe86c24763cf48583b64f06c372cc9658920e73c0ddac15304e40dc6f02b635', '12 Rose Colony, Andheri West, Mumbai 400053'),
    (2, 'Rahul Verma', 'rahul@example.com', '9988776655', 'pbkdf2$120000$custsalt5566778899$d92b60eaab6222485b9c8a95b7a0281b412b221af81dcb6d9b7618046462f77b841965c235e0a45e5554212e401b639bb72ba055ade3a80fab3ab7c1a84196f9', '44 Green Avenue, Bandra West, Mumbai 400050');

INSERT INTO SERVICE_PROVIDER (provider_id, name, email, phone, password, experience_years, status, bio, location_id, approved_by) VALUES
    (1, 'Ravi Kumar', 'ravi@example.com', '8877665544', 'pbkdf2$120000$provsalt0011223344$58c0ccef87d988d7aff597c8a14df6d1edf6f4a4a21a2ef4102fc80bd6c29d11f59c2dab08eb9715beaeb74e4349c8a8906c508efde0fa70228dfb070888df5b', 8, 'approved', 'Licensed plumber focused on residential repair visits and urgent maintenance.', 1, 1),
    (2, 'Ananya Electric Works', 'ananya@example.com', '8899001122', 'pbkdf2$120000$provsalt5566778899$f89ea2315715caf8ab0a065070552891fd355e77e3d91f7b6c4425e9f46d72ac58bc5a513b3c4d164d22a0d52d01741d4314c18e5267d6f9a4b04a8620effcdd', 6, 'approved', 'Home electrical specialists for switchboards, wiring faults, and appliance setup.', 3, 1),
    (3, 'CleanNest Services', 'cleannest@example.com', '9900112233', 'pbkdf2$120000$provsalt8899001122$81bb8502d927852496d3cc4f6c209018a8c4d8dfd2f63e7b59fc39b7bf0c257def24454482823c6a092fd2485293022c362d918bca5f2e213dc2928d27e63693', 4, 'pending', 'New partner team for scheduled deep-cleaning work.', 2, NULL);

INSERT INTO PROVIDER_SKILL (provider_id, skill_id) VALUES
    (1, 1), (1, 2),
    (2, 3), (2, 4),
    (3, 5), (3, 6);

INSERT INTO SERVICE (service_id, service_name, description, price, provider_id, category_id) VALUES
    (1, 'Pipe Fitting and Leak Repair', 'Inspection and repair of leaking taps, joints, and concealed pipelines.', 450.00, 1, 1),
    (2, 'Drain Unblocking Visit', 'Quick drain-clearing appointment for kitchen and bathroom lines.', 399.00, 1, 1),
    (3, 'Switchboard and Wiring Repair', 'Diagnosis and repair for faulty switches, boards, and minor wiring issues.', 650.00, 2, 2),
    (4, 'Appliance Safety Check', 'Testing and setup support for home appliances and circuit load balance.', 550.00, 2, 2),
    (5, 'Deep Home Cleaning Session', 'Full-home cleaning package for bedrooms, kitchens, and washrooms.', 1200.00, 3, 3);

INSERT INTO AVAILABILITY_SLOT (provider_id, slot_id, service_id, available_date, start_time, end_time) VALUES
    (1, 1, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '11:00:00'),
    (1, 2, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00', '16:00:00'),
    (2, 1, 3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', '12:00:00'),
    (2, 2, 4, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00:00', '17:00:00'),
    (3, 1, 5, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:30:00', '12:30:00');

INSERT INTO BOOKING (booking_id, booking_date, scheduled_time, status, notes, customer_id, service_id, provider_id, created_at) VALUES
    (1001, CURDATE(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'pending', 'Please call before arriving.', 1, 1, 1, NOW()),
    (1002, CURDATE(), DATE_ADD(NOW(), INTERVAL 2 DAY), 'confirmed', 'Need help with a flickering switchboard.', 1, 3, 2, NOW()),
    (1003, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY), 'completed', 'Kitchen sink issue.', 2, 2, 1, NOW()),
    (1004, DATE_SUB(CURDATE(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), 'completed', 'Check microwave and dishwasher outlet.', 1, 4, 2, NOW()),
    (1005, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'cancelled', 'Customer had to reschedule.', 2, 1, 1, NOW());

INSERT INTO PAYMENT (booking_id, payment_id, amount, method, payment_status, payment_date) VALUES
    (1001, 1, 450.00, 'upi', 'pending', CURDATE()),
    (1002, 1, 650.00, 'card', 'completed', CURDATE()),
    (1003, 1, 399.00, 'cash', 'completed', DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
    (1004, 1, 550.00, 'upi', 'completed', DATE_SUB(CURDATE(), INTERVAL 5 DAY));

INSERT INTO REVIEW (booking_id, review_id, rating, comment) VALUES
    (1003, 1, 5, 'Quick response, clear explanation, and the drain issue was fully resolved.'),
    (1004, 1, 4, 'Good service and punctual visit. The appliance checks were completed properly.');
