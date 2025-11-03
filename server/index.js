import 'dotenv/config'; 
import express from 'express';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION AND SETUP ---
const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL; 
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TRANSACTION_TABLE = 'transactions';

// Middleware to parse JSON request bodies
app.use(express.json());

// --- GLOBAL REQUEST LOGGER ---
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl} - Time: ${new Date().toISOString()}`);
    next();
});
// -----------------------------

// Helper function to format ISO 8601 time string
const getISOString = () => new Date().toISOString();

// --- CORE LOGIC: BACKGROUND PROCESSING ---

/**
 * Simulates a background worker processing a transaction.
 * This function handles the 30-second delay and final persistent storage update.
 *
 * @param {string} transaction_id - The ID of the transaction to process.
 */
const processTransactionInBackground = async (transaction_id) => {
    // Simulate 30-second processing delay (Requirement 3)
    const processingTimeMs = 30000;

    console.log(`[JOB ${transaction_id}] Starting background processing. Will take ${processingTimeMs}ms...`);

    // Wait for the simulated delay
    await new Promise(resolve => setTimeout(resolve, processingTimeMs));

    try {
        // 1. Finalize transaction status and timestamp
        const processedAt = getISOString();
        const finalStatus = 'PROCESSED';

        // 2. Update the record in Supabase
        const { data, error } = await supabase
            .from(TRANSACTION_TABLE)
            .update({ status: finalStatus, processed_at: processedAt })
            .eq('transaction_id', transaction_id)
            .eq('status', 'PROCESSING') // Crucial: only update if not already processed
            .select();

        if (error) {
            console.error(`[JOB ${transaction_id}] Supabase Update Error:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`[JOB ${transaction_id}] Successfully processed and updated status to ${finalStatus}.`);
        } else {
            // This happens if the status was already PROCESSED (i.e., another job finished first, or initial update failed)
            console.warn(`[JOB ${transaction_id}] Update skipped. Record not found or status was not 'PROCESSING'.`);
        }

    } catch (e) {
        console.error(`[JOB ${transaction_id}] Critical Processing Error:`, e);
    }
};


// --- API ENDPOINTS ---

/**
 * 1. Health Check Endpoint (GET /)
 */
app.get('/', async (req, res) => {
    let dbStatus = 'UNKNOWN';
    try {
        const { error } = await supabase.from(TRANSACTION_TABLE).select('transaction_id').limit(1);
        dbStatus = error ? 'DATABASE_ERROR' : 'CONNECTED';
    } catch (e) {
        dbStatus = 'CONNECTION_FAILED';
    }

    res.status(200).json({
        status: 'HEALTHY',
        current_time: getISOString(),
        database_status: dbStatus,
        info: 'Webhook service is operational and connected to Supabase.'
    });
});


/**
 * 2. Webhook Endpoint (POST /v1/webhooks/transactions)
 *
 * This implementation leverages the Supabase `ON CONFLICT` feature for idempotency.
 * Since 'transaction_id' is the primary key, a duplicate insert will trigger a conflict.
 */
app.post('/v1/webhooks/transactions', async (req, res) => {
    const { transaction_id, source_account, destination_account, amount, currency } = req.body;

    // Input Validation (Basic check)
    if (!transaction_id || !amount) {
        return res.status(400).json({ error: 'Missing required fields: transaction_id and amount are required.' });
    }

    // Prepare data for insertion (DB will handle created_at automatically)
    const newTransaction = {
        transaction_id,
        source_account,
        destination_account,
        amount,
        currency,
        status: 'PROCESSING', // Initial status
        processed_at: null,
    };

    try {
        // Attempt to insert the new transaction.
        const { error: insertError } = await supabase
            .from(TRANSACTION_TABLE)
            .insert(newTransaction)
            .select();

        if (insertError) {
            // Check for a duplicate key error (which indicates idempotency is needed)
            // Postgres error code 23505 is for unique_violation (which primary key enforces)
            if (insertError.code === '23505') {
                
                // --- Idempotency Logic (Requirement 4) ---
                console.log(`[IDEMPOTENCY] Duplicate transaction ID ${transaction_id} detected during insert.`);
                
                // Fetch the current status of the existing record to return to the caller
                const { data: existingData, error: selectError } = await supabase
                    .from(TRANSACTION_TABLE)
                    .select('status')
                    .eq('transaction_id', transaction_id)
                    .limit(1);

                if (selectError) throw selectError;

                const existingStatus = existingData[0]?.status || 'UNKNOWN';

                // Acknowledge immediately without re-processing
                return res.status(202).json({
                    message: 'Webhook received. Transaction already exists.',
                    transaction_id: transaction_id,
                    status: existingStatus
                });
            }
            // For other insertion errors, log and throw
            throw insertError;
        }

        // --- Success: New Transaction Inserted ---
        
        // Launch the background processing job (deliberately not using await)
        processTransactionInBackground(transaction_id);

        // Immediate Response (Requirement 2)
        console.log(`[WEBHOOK] Received new webhook for ${transaction_id}. Responding with 202.`);
        res.status(202).json({
            message: 'Webhook received. Transaction is queued for background processing.',
            transaction_id: transaction_id
        });

    } catch (e) {
        console.error(`[WEBHOOK] Critical database operation failed:`, e.message);
        // Respond with a 500 Internal Server Error if we can't save the transaction
        res.status(500).json({ error: 'Internal Server Error: Failed to process webhook request.' });
    }
});


/**
 * 3. Transaction Status Endpoint (GET /v1/transactions/{transaction_id})
 */
app.get('/v1/transactions/:transaction_id', async (req, res) => {
    const transaction_id = req.params.transaction_id;

    try {
        const { data, error } = await supabase
            .from(TRANSACTION_TABLE)
            .select('*')
            .eq('transaction_id', transaction_id)
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Transaction ID not found.' });
        }

        const transaction = data[0];

        // Structure the response according to the assessment requirements
        const response = {
            transaction_id: transaction.transaction_id,
            source_account: transaction.source_account,
            destination_account: transaction.destination_account,
            // Supabase returns NUMERIC types as strings, so we convert back
            amount: parseFloat(transaction.amount), 
            currency: transaction.currency,
            status: transaction.status,
            created_at: transaction.created_at,
            processed_at: transaction.processed_at // null if PROCESSING
        };

        res.status(200).json(response);

    } catch (e) {
        console.error(`[STATUS] Database query failed:`, e.message);
        res.status(500).json({ error: 'Internal Server Error: Could not retrieve transaction status.' });
    }
});


// --- SERVER STARTUP AND CONNECTION CHECK ---
const checkSupabaseConnection = async () => {
    console.log('--- Initializing Supabase Connection Check ---');
    try {
        // Attempt a simple query to verify connection and credentials
        // Using limit(0) ensures no data is transferred, just a connection and permissions check
        const { error } = await supabase.from(TRANSACTION_TABLE).select('transaction_id').limit(0);
        
        if (error) {
            console.error('\n!!! CRITICAL SUPABASE CONNECTION FAILED !!!');
            console.error(`Error Code: ${error.code || 'N/A'}`);
            console.error(`Error Message: ${error.message}`);
            console.error(`Action: Check SUPABASE_URL, SUPABASE_KEY, and ensure the table '${TRANSACTION_TABLE}' exists.`);
            process.exit(1); // Exit if connection is truly broken
        }
        
        console.log('--- Supabase Connection Successful! ---');
        return true;

    } catch (e) {
        console.error('\n!!! CRITICAL SUPABASE CONNECTION FAILED (Network/Client Error) !!!');
        console.error(`Error: ${e.message}`);
        console.error('Action: Ensure the required environment variables are set and accessible.');
        process.exit(1);
    }
}

// Start the server only after confirming database connectivity
checkSupabaseConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log('-----------------');
        console.log(`Endpoints available:`);
        console.log(`- Health Check: GET /`);
        console.log(`- Webhook: POST /v1/webhooks/transactions (Body: { transaction_id, amount, ... })`);
        console.log(`- Status Query: GET /v1/transactions/:transaction_id`);
    });
});

