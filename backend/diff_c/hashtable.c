#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "hashtable.h"

/// djb2 hash algorithm
unsigned long hash(const char* key)
{
    unsigned long hash = 5381;
    int c;

    while ((c = *key++))
        hash = ((hash << 5) + hash) + c; /* hash * 33 + c */

    return hash;
}

ht* ht_create(void(*destroy_function))
{
    ht* table = malloc(sizeof(ht));
    if (table == NULL) {
        return NULL;
    }

    table->items = calloc(INITIAL_CAPACITY, sizeof(ht_item));
    table->capacity = INITIAL_CAPACITY;
    table->size = 0;
    table->destroy_function = destroy_function;

    return table;
}

void ht_destroy(ht* table)
{
    for (size_t i = 0; i < table->capacity; i++) {
        ht_item* item = &table->items[i];

        if (item->key != NULL) {
            free((void*)item->key);
            if (table->destroy_function != NULL) {
                table->destroy_function(item->value);
            }
        }
    }

    free(table->items);
    free(table);
}

void ht_insert_item(ht_item* items, size_t capacity, const char* key, void* value)
{
    unsigned long index = hash(key) & (capacity - 1);

    while (items[index].key != NULL) {
        if (strcmp(key, items[index].key) == 0) {
            // Update existing item
            items[index].value = value;
            return;
        }

        index++;
        if (index >= capacity) {
            index = 0;
        }
    }

    // Can insert
    items[index].key = strdup(key);
    items[index].value = value;
}

void ht_grow(ht* table)
{
    size_t new_capacity = table->capacity * 2;
    ht_item* new_items = calloc(new_capacity, sizeof(ht_item));

    for (size_t i = 0; i < table->capacity; i++) {
        ht_item item = table->items[i];
        if (item.key != NULL) {
            ht_insert_item(new_items, new_capacity, item.key, item.value);
            free((void*)item.key);
        }
    }

    free(table->items);
    table->items = new_items;
    table->capacity = new_capacity;
}

void ht_insert(ht* table, const char* key, void* value)
{
    if (table->size + 1 >= table->capacity / 2) {
        ht_grow(table);
    }

    ht_insert_item(table->items, table->capacity, key, value);
    table->size++;
}

void* ht_get(const ht* table, const char* key)
{
    unsigned long index = hash(key) & (table->capacity - 1);

    while (table->items[index].key != NULL) {
        if (strcmp(key, table->items[index].key) == 0) {
            return table->items[index].value;
        }

        index++;
        if (index >= table->capacity) {
            index = 0;
        }
    }
    return NULL;
}

ht_iter ht_iterator(ht* table)
{
    ht_iter it;
    it._table = table;
    it._index = 0;
    return it;
}

bool ht_next(ht_iter* it)
{
    while (it->_index < it->_table->capacity) {
        ht_item item = it->_table->items[it->_index++];

        if (item.key != NULL) {
            it->key = item.key;
            it->value = item.value;
            return true;
        }
    }
    return false;
}
