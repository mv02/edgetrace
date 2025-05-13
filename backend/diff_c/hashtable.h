/**
 * File: backend/app/diff_c/hashtable.h
 * Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
 * Description: Declares a hash table data structure.
 *              Inspired by: https://benhoyt.com/writings/hash-table-in-c
 */

#ifndef HASHTABLE_H
#define HASHTABLE_H

#include <stdbool.h>
#include <stddef.h>

#define INITIAL_CAPACITY 65536

typedef struct ht_item {
    const char* key;
    void* value;
} ht_item;

typedef struct ht {
    ht_item* items;
    size_t capacity;
    size_t size;
    void (*destroy_function)(void*);
} ht;

typedef struct ht_iter {
    const char* key;
    void* value;
    ht* _table;
    size_t _index;
} ht_iter;

unsigned long hash(const char* key);

ht* ht_create(void(*destroy_function));
void ht_destroy(ht* table);
void ht_insert(ht* table, const char* key, void* value);
void* ht_get(const ht* table, const char* key);
ht_iter ht_iterator(ht* table);
bool ht_next(ht_iter* it);

ht_item* ht_item_create(const char* key, void* value);
void ht_item_destroy(ht_item* item);

#endif
