
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://anpqqsjrubqjndbijinn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucHFxc2pydWJxam5kYmlqaW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTIxMTYsImV4cCI6MjA4MTM4ODExNn0.qejlYdwegKmOnSDwCWgnFHTDYpnj5yfOx9zwcF9hzZA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Fetching statuses...');
    const { data, error } = await supabase
        .from('tasks')
        .select('status, id'); // Select ID for sampling

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No tasks found.');
        return;
    }

    const unique = [...new Set(data.map(d => d.status))];
    console.log('Unique Statuses found:', unique);

    unique.forEach(s => {
        console.log(`'${s}' type: ${typeof s}, length: ${s ? s.length : 0}`);
        // Log one example ID for each status
        const example = data.find(d => d.status === s);
        console.log(`  Example ID: ${example.id}`);
    });
}

check();
