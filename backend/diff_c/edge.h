/**
 * File: backend/app/diff_c/edge.h
 * Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
 * Description: Declares a structure representing call graph edges,
 *              and functions for creating, destroying, and printing them.
 */

#ifndef EDGE_H
#define EDGE_H

#include "method.h"

typedef struct edge {
    int id;
    method_t* source;
    method_t* target;
    double value;
    struct edge* next;
} edge_t;

edge_t* edge_create(method_t* source, method_t* target, int id);
void edge_destroy(edge_t* edge);
char* edge_key(int source_id, int target_id);
void edge_print(edge_t* edge);
void edge_print_cypher(edge_t* edge, int depth);

#endif
