-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 24, 2026 at 01:34 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bill_splitter`
--

-- --------------------------------------------------------

--
-- Table structure for table `bills`
--

CREATE TABLE `bills` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `tax` decimal(10,2) DEFAULT 0.00,
  `tip` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL,
  `created_by` int(11) NOT NULL,
  `split_method` varchar(50) DEFAULT 'equal',
  `status` enum('pending','partial','paid') DEFAULT 'pending',
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bills`
--

INSERT INTO `bills` (`id`, `group_id`, `title`, `description`, `subtotal`, `tax`, `tip`, `total`, `created_by`, `split_method`, `status`, `due_date`, `created_at`, `updated_at`) VALUES
(1, 1, 'keshp', '', 0.00, 0.00, 0.00, 1000.00, 1, 'equal', 'paid', NULL, '2026-03-23 22:24:02', '2026-03-23 22:24:44'),
(2, 1, 'eeeeeh', '', 0.00, 0.00, 0.00, 2000.00, 1, 'equal', 'paid', NULL, '2026-03-23 22:26:09', '2026-03-23 23:12:46'),
(3, 1, 'ggggg', '', 0.00, 0.00, 0.00, 29320986.25, 1, 'equal', 'paid', NULL, '2026-03-23 23:12:02', '2026-03-23 23:12:38'),
(4, 1, 'gaga', '', 0.00, 0.00, 0.00, 6300.00, 1, 'equal', 'pending', NULL, '2026-03-24 09:08:39', '2026-03-24 09:08:39'),
(5, 4, 'konami coins', '', 0.00, 0.00, 0.00, 40000.00, 2, 'equal', 'pending', NULL, '2026-03-24 12:09:57', '2026-03-24 12:09:57');

-- --------------------------------------------------------

--
-- Table structure for table `bill_items`
--

CREATE TABLE `bill_items` (
  `id` int(11) NOT NULL,
  `bill_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  `assigned_to` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bill_items`
--

INSERT INTO `bill_items` (`id`, `bill_id`, `name`, `amount`, `quantity`, `assigned_to`) VALUES
(1, 1, 'pizza', 200.00, 5, NULL),
(2, 2, 'pizza', 2000.00, 1, NULL),
(3, 3, 'ddnhsgs', 23456789.00, 1, NULL),
(4, 4, 'pizza', 5000.00, 1, NULL),
(5, 5, 'coin', 20000.00, 2, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `bill_name_splits`
--

CREATE TABLE `bill_name_splits` (
  `id` int(11) NOT NULL,
  `bill_id` int(11) NOT NULL,
  `name_member_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid` tinyint(1) DEFAULT 0,
  `paid_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bill_name_splits`
--

INSERT INTO `bill_name_splits` (`id`, `bill_id`, `name_member_id`, `amount`, `paid`, `paid_at`) VALUES
(1, 3, 10, 7330246.56, 0, NULL),
(2, 3, 3, 7330246.56, 0, NULL),
(3, 3, 1, 7330246.56, 0, NULL),
(4, 4, 10, 1575.00, 0, NULL),
(5, 4, 3, 1575.00, 0, NULL),
(6, 4, 1, 1575.00, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `bill_splits`
--

CREATE TABLE `bill_splits` (
  `id` int(11) NOT NULL,
  `bill_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid` tinyint(1) DEFAULT 0,
  `paid_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bill_splits`
--

INSERT INTO `bill_splits` (`id`, `bill_id`, `user_id`, `amount`, `paid`, `paid_at`) VALUES
(1, 1, 1, 1000.00, 1, '2026-03-23 22:24:44'),
(2, 2, 1, 2000.00, 1, '2026-03-23 23:12:46'),
(3, 3, 1, 7330246.56, 1, '2026-03-23 23:12:38'),
(4, 4, 1, 1575.00, 0, NULL),
(5, 5, 2, 20000.00, 0, NULL),
(6, 5, 1, 20000.00, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `groups`
--

CREATE TABLE `groups` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `invite_code` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `groups`
--

INSERT INTO `groups` (`id`, `name`, `description`, `created_by`, `invite_code`, `created_at`) VALUES
(1, 'zaza', '', 1, 'N5SGPUUK', '2026-03-23 20:08:42'),
(2, 'food', '', 1, 'WL096CIK', '2026-03-23 22:11:07'),
(3, 'konami', '', 1, '9FO8ETLK', '2026-03-24 11:45:16'),
(4, 'konami', '', 2, 'VKVF7RGL', '2026-03-24 12:08:16');

-- --------------------------------------------------------

--
-- Table structure for table `group_goals`
--

CREATE TABLE `group_goals` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `target` decimal(10,2) NOT NULL,
  `deadline` date DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `group_goal_contributions`
--

CREATE TABLE `group_goal_contributions` (
  `id` int(11) NOT NULL,
  `goal_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `contributor_name` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `group_members`
--

CREATE TABLE `group_members` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('admin','member') DEFAULT 'member',
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `group_members`
--

INSERT INTO `group_members` (`id`, `group_id`, `user_id`, `role`, `joined_at`) VALUES
(1, 1, 1, 'admin', '2026-03-23 20:08:42'),
(2, 2, 1, 'admin', '2026-03-23 22:11:07'),
(3, 3, 1, 'admin', '2026-03-24 11:45:16'),
(4, 4, 2, 'admin', '2026-03-24 12:08:16'),
(5, 4, 1, 'member', '2026-03-24 12:08:35');

-- --------------------------------------------------------

--
-- Table structure for table `group_name_members`
--

CREATE TABLE `group_name_members` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `group_name_members`
--

INSERT INTO `group_name_members` (`id`, `group_id`, `name`, `created_by`, `created_at`) VALUES
(1, 1, 'sasa', 1, '2026-03-23 21:02:18'),
(3, 1, 'poa', 1, '2026-03-23 21:02:52'),
(9, 2, 'dada', NULL, '2026-03-23 22:15:59'),
(10, 1, 'dada', NULL, '2026-03-23 22:16:19');

-- --------------------------------------------------------

--
-- Table structure for table `name_payments`
--

CREATE TABLE `name_payments` (
  `id` int(11) NOT NULL,
  `bill_id` int(11) NOT NULL,
  `name_member_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `paid_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `name_payments`
--

INSERT INTO `name_payments` (`id`, `bill_id`, `name_member_id`, `amount`, `method`, `notes`, `paid_at`) VALUES
(1, 3, 1, 7330246.56, 'cash', 'Marked as paid', '2026-03-23 23:12:31'),
(2, 3, 3, 7330246.56, 'cash', 'Marked as paid', '2026-03-23 23:12:33'),
(3, 3, 10, 7330246.56, 'cash', 'Marked as paid', '2026-03-23 23:12:35');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `related_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `is_read`, `related_id`, `created_at`) VALUES
(1, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:20:52'),
(2, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:24:18'),
(3, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:24:21'),
(4, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:24:24'),
(5, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:24:24'),
(6, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:24:25'),
(7, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:24:25'),
(8, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:26:04'),
(9, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:26:33'),
(10, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:26:34'),
(11, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:26:34'),
(12, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:26:34'),
(13, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:26:35'),
(14, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:27:48'),
(15, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:01'),
(16, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:04'),
(17, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:04'),
(18, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:04'),
(19, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:05'),
(20, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:05'),
(21, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:05'),
(22, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:05'),
(23, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:05'),
(24, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:08'),
(25, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:08'),
(26, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:08'),
(27, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:08'),
(28, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:28:08'),
(29, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:43'),
(30, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:45'),
(31, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:45'),
(32, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:46'),
(33, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:50'),
(34, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:50'),
(35, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:50'),
(36, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:51'),
(37, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:51'),
(38, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:51'),
(39, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:52'),
(40, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:53'),
(41, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:53'),
(42, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:54'),
(43, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:54'),
(44, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:55'),
(45, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:55'),
(46, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:57'),
(47, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:57'),
(48, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:57'),
(49, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:58'),
(50, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:59'),
(51, 1, 'payment_reminder', 'Payment Reminder', 'Bill Odhiambo reminded you to pay $1575.00 for \"gaga\"', 0, 4, '2026-03-24 09:33:59'),
(52, 1, 'group_invite', 'Added To Group', 'Daniel Munyiri added you to \"konami\"', 0, 4, '2026-03-24 12:08:35'),
(53, 2, 'payment_reminder', 'Payment Reminder', 'Daniel Munyiri reminded you to pay $20000.00 for \"konami coins\"', 0, 5, '2026-03-24 12:10:08'),
(54, 1, 'payment_reminder', 'Payment Reminder', 'Daniel Munyiri reminded you to pay $20000.00 for \"konami coins\"', 0, 5, '2026-03-24 12:10:12'),
(55, 1, 'payment_reminder', 'Payment Reminder', 'Daniel Munyiri reminded you to pay $20000.00 for \"konami coins\"', 0, 5, '2026-03-24 12:10:42');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `bill_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `paid_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `bill_id`, `user_id`, `amount`, `method`, `notes`, `paid_at`) VALUES
(1, 1, 1, 1000.00, 'cash', 'Marked as paid', '2026-03-23 22:24:44'),
(2, 3, 1, 7330246.56, 'cash', 'Marked as paid', '2026-03-23 23:12:38'),
(3, 2, 1, 2000.00, 'cash', 'Marked as paid', '2026-03-23 23:12:46');

-- --------------------------------------------------------

--
-- Table structure for table `recurring_bills`
--

CREATE TABLE `recurring_bills` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `frequency` enum('daily','weekly','monthly','yearly') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `verification_token` varchar(255) DEFAULT NULL,
  `verification_code` varchar(10) DEFAULT NULL,
  `verification_code_expires` datetime DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `avatar`, `is_verified`, `verification_token`, `verification_code`, `verification_code_expires`, `reset_token`, `reset_token_expires`, `created_at`, `updated_at`) VALUES
(1, 'Bill Odhiambo', 'billodhiambo483@gmail.com', '$2a$10$NjfdecgVPwp2xl8II6A6DeOmnRsO6KRjzttOr5CGwUJ7Lsh2xWwsO', NULL, 1, NULL, NULL, NULL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJiaWxsb2RoaWFtYm80ODNAZ21haWwuY29tIiwicHVycG9zZSI6InBhc3N3b3JkX3Jlc2V0IiwiaWF0IjoxNzc0MzQzMjA0LCJleHAiOjE3NzQzNDY4MDR9.Dgm2WZZ9rBGjUjS6EErBMtTWUovz2O7d3SLPc5rYlP4', '2026-03-24 13:06:44', '2026-03-23 18:48:19', '2026-03-24 09:06:44'),
(2, 'Daniel Munyiri', 'danielmunyiri97@gmail.com', '$2a$10$5GXh5qEjZVW0kd9hukCAdOB8LyUOzEOye3Pe2QVQcR1HD5a.4EGN6', NULL, 1, NULL, NULL, NULL, NULL, NULL, '2026-03-24 12:02:08', '2026-03-24 12:07:03'),
(3, 'Musa', 'muirurimoses78@gmail.com', '$2a$10$g9CuVXrsaO.wBO71jPTJhujv6NEpVsWF4PtwKI9sDEm5jwHBviMFy', NULL, 1, NULL, NULL, NULL, NULL, NULL, '2026-03-24 12:13:44', '2026-03-24 12:15:51');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bills`
--
ALTER TABLE `bills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_bills_group_id` (`group_id`);

--
-- Indexes for table `bill_items`
--
ALTER TABLE `bill_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bill_id` (`bill_id`),
  ADD KEY `assigned_to` (`assigned_to`);

--
-- Indexes for table `bill_name_splits`
--
ALTER TABLE `bill_name_splits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_name_split` (`bill_id`,`name_member_id`),
  ADD KEY `name_member_id` (`name_member_id`);

--
-- Indexes for table `bill_splits`
--
ALTER TABLE `bill_splits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_split` (`bill_id`,`user_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_bill_splits_bill_id` (`bill_id`);

--
-- Indexes for table `groups`
--
ALTER TABLE `groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invite_code` (`invite_code`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_groups_invite_code` (`invite_code`);

--
-- Indexes for table `group_goals`
--
ALTER TABLE `group_goals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `group_id` (`group_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `group_goal_contributions`
--
ALTER TABLE `group_goal_contributions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `goal_id` (`goal_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `group_members`
--
ALTER TABLE `group_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_member` (`group_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `group_name_members`
--
ALTER TABLE `group_name_members`
  ADD PRIMARY KEY (`id`),
  ADD KEY `group_id` (`group_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `name_payments`
--
ALTER TABLE `name_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bill_id` (`bill_id`),
  ADD KEY `name_member_id` (`name_member_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user_id` (`user_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bill_id` (`bill_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `recurring_bills`
--
ALTER TABLE `recurring_bills`
  ADD PRIMARY KEY (`id`),
  ADD KEY `group_id` (`group_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bills`
--
ALTER TABLE `bills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `bill_items`
--
ALTER TABLE `bill_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `bill_name_splits`
--
ALTER TABLE `bill_name_splits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `bill_splits`
--
ALTER TABLE `bill_splits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `groups`
--
ALTER TABLE `groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `group_goals`
--
ALTER TABLE `group_goals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `group_goal_contributions`
--
ALTER TABLE `group_goal_contributions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `group_members`
--
ALTER TABLE `group_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `group_name_members`
--
ALTER TABLE `group_name_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `name_payments`
--
ALTER TABLE `name_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `recurring_bills`
--
ALTER TABLE `recurring_bills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bills`
--
ALTER TABLE `bills`
  ADD CONSTRAINT `bills_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bills_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `bill_items`
--
ALTER TABLE `bill_items`
  ADD CONSTRAINT `bill_items_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bill_items_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `bill_name_splits`
--
ALTER TABLE `bill_name_splits`
  ADD CONSTRAINT `bill_name_splits_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bill_name_splits_ibfk_2` FOREIGN KEY (`name_member_id`) REFERENCES `group_name_members` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `bill_splits`
--
ALTER TABLE `bill_splits`
  ADD CONSTRAINT `bill_splits_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bill_splits_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `groups`
--
ALTER TABLE `groups`
  ADD CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `group_goals`
--
ALTER TABLE `group_goals`
  ADD CONSTRAINT `group_goals_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_goals_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `group_goal_contributions`
--
ALTER TABLE `group_goal_contributions`
  ADD CONSTRAINT `group_goal_contributions_ibfk_1` FOREIGN KEY (`goal_id`) REFERENCES `group_goals` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_goal_contributions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `group_members`
--
ALTER TABLE `group_members`
  ADD CONSTRAINT `group_members_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `group_name_members`
--
ALTER TABLE `group_name_members`
  ADD CONSTRAINT `group_name_members_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_name_members_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `name_payments`
--
ALTER TABLE `name_payments`
  ADD CONSTRAINT `name_payments_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `name_payments_ibfk_2` FOREIGN KEY (`name_member_id`) REFERENCES `group_name_members` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `recurring_bills`
--
ALTER TABLE `recurring_bills`
  ADD CONSTRAINT `recurring_bills_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `recurring_bills_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
